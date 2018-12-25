<template>
  <div class="upload">
    <div class="upload-main">
      <input type="file" :accept="accept" @change="handlerFileChange" :multiple="multiple && 'multiple'"/>
      <slot name="select-btn">
        <div class="btn">
          <button>选择文件</button>
        </div>
      </slot>
    </div>
    <ul class="upload-list">
      <li
        v-for="(file, index) in fileList"
        :key="file.name"
      >
        <img :src="file.preview" v-if="file.preview"/>
        <label>
          ({{getSize(file.size)}})
          {{file.name}}
        </label>
        <span
          @click="handlerRemoveFile(file, index)"
          :class="{
            error: (file.status === UPLOAD_FAIL || !!file.msg),
            success: file.status === UPLOAD_SUCCESS
          }"
        >
          {{file.msg || (file.per? `${file.per}%`: '')}}
        </span>
        <i
          :style="{ width: `${file.per || 0}%` }"
          :class="{
            error: file.status === UPLOAD_FAIL,
            success: file.status === UPLOAD_SUCCESS
          }"
        />
      </li>
    </ul>
    <button
      v-if="fileList.some(f => [READY_UPLOAD, UPLOAD_FAIL].includes(f.status))"
      @click="handlerUploading"
    >
      开始上传
    </button>
  </div>
</template>
<script>
import axios from 'axios'
const requestCancelQueue = {} // 请求方法队列（调用取消上传
const VALIDATE_FAIL = -1 // 文件验证失败，只能删除
const READY_UPLOAD = 0 // 待上传
const UPLOADING = 1 // 上传中
const UPLOAD_FAIL = 2 // 上传失败
const UPLOAD_SUCCESS = 3 // 上传成功
export default {
  name: 'upload-app',
  props: {
    multiple: {
      type: Boolean,
      default: true
    },
    // input[type="file"] accept
    accept: {
      type: String,
      default: 'image/*'
    },
    // 上传的文件列表，可支持默认，必须设置preview属性和status=UPLOAD_SUCCESS
    fileList: {
      type: Array,
      default: () => [] 
    },
    // 上传最大文件限制
    maxSize: {
      type: Number,
      default: 5 * 1024 * 1024 * 1024
    },
    // 大于这个大小的文件使用分块上传(后端可以支持断点续传)
    multiUploadSize: {
      type: Number,
      default: 100 * 1024 * 1024
    },
    // 每块文件大小
    eachSize: {
      type: Number,
      default: 50 * 1024 * 1024
    },
    postUrl: {
      type: String,
      default: 'http://localhost:8888'
    },
    validateUrl: {
      type: String,
      default: 'http://localhost:8888/validateFile'
    }
  },
  data () {
    return {
      READY_UPLOAD,
      UPLOADING,
      UPLOAD_FAIL,
      UPLOAD_SUCCESS
    }
  },
  methods: {
    handlerFileChange ({ target: { files } }) {
      const { fileList, maxSize, getImgBlob } = this
      Array.prototype.map.call(files, file => {
        if (!fileList.some(f => f.name === file.name)) {
          file.preview = getImgBlob(file)
          file.status = READY_UPLOAD
          if (file.size > maxSize) {
            file.status = VALIDATE_FAIL
            file.msg = `大于${this.getSize(maxSize)}`
          }
          fileList.push(file)
        }
      })
    },
    // 从数组读取未上传和失败文件进行上传
    handlerUploading () {
      const { fileList, multiUploadSize, splitUpload, singleUpload, setFileData } = this
      fileList.map(file => {
        if ([READY_UPLOAD, UPLOAD_FAIL].includes(file.status)) {
          const uploadFunc = file.size > multiUploadSize ? splitUpload : singleUpload
          setFileData(file.name, {
            per: 0,
            msg: null,
            status: UPLOADING
          })
          uploadFunc(file)
        }
      })
    },
    // 单文件直接上传
    async singleUpload (file) {
      const { setFileData } = this
      try {
        await this.postFile({ file, fileName: file.name })
        setFileData(file.name, 'status', UPLOAD_SUCCESS)
      } catch (e) {
        setFileData(file.name, {
          per: 0,
          msg: e,
          status: UPLOAD_FAIL
        })
      }
    },
    // 大文件分块上传
    async splitUpload (file) {
      const { eachSize, setFileData } = this
      try {
        const chunks = Math.ceil(file.size / eachSize)
        const fileChunks = await this.splitFile(file, eachSize, chunks)
        let currentChunk = 0
        for (let i = 0; i < fileChunks.length; i++) {
          // 服务端检测已经上传到第currentChunk块了，那就直接跳到第currentChunk块，实现断点续传
          console.log(`currentChunk：${currentChunk}，uploadChunk：${i}`)
          if (Number(currentChunk) === i) {
            // 每块上传完后则返回需要提交的下一块的index
            currentChunk = await this.postFile({
              chunked: true,
              chunk: i,
              chunks,
              eachSize,
              fileName: file.name,
              fullSize: file.size,
              file: fileChunks[i]
            })
          }
        }
        setFileData(file.name, 'per', 99.99)
        const isValidate = await this.validateFile({
          chunks: fileChunks.length,
          fileName: file.name,
          fullSize: file.size
        })
        if (!isValidate) {
          throw new Error('文件校验异常')
        }
        setFileData(file.name, {
          per: 100,
          status: UPLOAD_SUCCESS
        })
      } catch (e) {
        setFileData(file.name, {
          per: 0,
          msg: e,
          status: UPLOAD_FAIL
        })
      }
    },
    // 格式化文件大小显示文字
    getSize (size) {
      return size > 1024
        ? size / 1024 > 1024
          ? size / (1024 * 1024) > 1024
            ? (size / (1024 * 1024 * 1024)).toFixed(2) + 'GB'
            : (size / (1024 * 1024)).toFixed(2) + 'MB'
          : (size / 1024).toFixed(2) + 'KB'
        : (size).toFixed(2) + 'B'
    },
    // 文件分块,利用Array.prototype.slice方法
    splitFile (file, eachSize, chunks) {
      return new Promise((resolve, reject) => {
        try {
          setTimeout(() => {
            const fileChunk = []
            for (let chunk = 0; chunks > 0; chunks--) {
              fileChunk.push(file.slice(chunk, chunk + eachSize))
              chunk += eachSize
            }
            resolve(fileChunk)
          }, 0)
        } catch (e) {
          console.error(e)
          reject(new Error('文件切块发生错误'))
        }
      })
    },
    handlerRemoveFile (file, index) {
      if (requestCancelQueue[file.name]) {
        requestCancelQueue[file.name]()
        delete requestCancelQueue[file.name]
      }
      this.fileList.splice(index, 1)
    },
    // 提交文件方法,将参数转换为FormData, 然后通过axios发起请求
    postFile (param) {
      const formData = new FormData()
      for (let p in param) {
        formData.append(p, param[p])
      }
      const { fileName } = param
      const config = {
        cancelToken: new axios.CancelToken(function (cancel) {
          if (requestCancelQueue[fileName]) {
            requestCancelQueue[fileName]()
            delete requestCancelQueue[fileName]
          }
          requestCancelQueue[fileName] = cancel
        }),
        onUploadProgress: e => {
          let percent = 0
          if (param.chunked) {
            percent = Number(((((param.chunk * (param.eachSize - 1)) + (e.loaded)) / param.fullSize) * 100).toFixed(2))
          } else {
            percent = Number(((e.loaded / e.total) * 100).toFixed(2))
          }
          this.setFileData(fileName, 'per', percent)
        }
      }
      return axios.post(this.postUrl, formData, config).then(rs => rs.data)
    },
    // 文件校验方法
    validateFile (file) {
      return axios.post(this.validateUrl, file).then(rs => rs.data)
    },
    getImgBlob (file) {
      return /\w(\.gif|\.jpeg|\.png|\.jpg|\.bmp)/i.test(file.name)? window.URL.createObjectURL(file): null
    },
    setFileData (fileName, key, value) {
      const index = this.fileList.findIndex(f => f.name === fileName)
      const file = this.fileList[index]
      if (!file) return
      if ('string' === typeof key) {
        file[key] = value
      } else {
        for (let k in key) {
          file[k] = key[key]
        }
      }
      this.$set(this.fileList, index, file)
    }
  }
}
</script>
<style lang="less" scoped>
.upload{
  width: 100%;
  height: 100%;
  &-main{
    position: relative;
    display: inline-block;
    input[type="file"]{
      width: 100%;
      height: 100%;
      position: absolute;
      z-index: 1;
      left: 0;
      top: 0;
      opacity: 0;
      cursor: pointer;
    }
    .btn{
      text-align: center;
    }
  }
  &-list{
    list-style: none;
    padding: 10px;
    li{
      padding: 10px 0;
      display: flex;
      align-items: center;
      position: relative;
      img{
        width: 40px;
        height: 40px;
      }
      label{
        padding-left: 10px;
        flex: 1;
        overflow: hidden;
        text-overflow:ellipsis;
        white-space: nowrap
      }
      span{
        padding-right: 20px;
        height: 20px;
        position: relative;
        cursor: pointer;
        transition: transform .3s;
        .icon{
          content: '';
          position: absolute;
          top: 2px;
          right: 4px;
          width: 2px;
          height: 12px;
          background: #cccccc;
        }
        &:before{
          .icon;
          transform: rotate(45deg); 
        }
        &:after{
          .icon;
          transform: rotate(-45deg); 
        }
        &:hover{
          transform: scale(1.2);
        }
        &.error{
          color: #ed4014;
        }
        &.success{
          color: #19be6b;
        }
      }
      i{
        position: absolute;
        bottom: 4px;
        left: 0;
        display: block;
        height: 5px;
        border-radius: 5px;
        transition: all .3s;
        opacity: .8;
        background: #2D8cF0;
        &.error{
          background: #ed4014;
        }
        &.success{
          background: #19be6b;
        }
      }
    }
  }
  button{
    background: #2D8cF0;
    width: 100%;
    padding: 5px;
    border: 0;
    border-radius: 5px;
    color:#fff;
    cursor: pointer;
  }
}
</style>
