<template>
  <div id="app">
    <VueUpload></VueUpload>
    <br />
    <br />
    <br />
    <br />
    <VueUpload>
      <button slot="select-btn">自定义按钮选择文件上传</button>
      <div slot-scope="{ list, remove }" slot="file-list">
        <p v-for="(file, index) in list" :key="index">
          {{getFileName(file)}}
          <button @click="remove(file, index)">删除</button>
        </p>
      </div>
      <div slot-scope="{ handlerStartUpload }" slot="upload-btn">
        <button @click="handlerStartUpload">开始上传</button>
      </div>
    </VueUpload>
  </div>
</template>

<script>
import VueUpload from './components/vue-upload'
export default {
  name: 'app',
  components: { VueUpload },
  data () {
    return {
    }
  },
  methods: {
    getFileName (file) {
      // per: 0  当前上传的进度
      // preview: ""  图片预览，由前端生成，图片文件才有
      // size: 文件大小
      // status: 0  文件状态 -1： 文件验证失败，只能删除； 0： 待上传； 1： 上传中； 2： 上传失败； 3： 上传成功
      return file.name
    }
  }
}
</script>
<style lang="less">
html, body{
  height: 100%;
  width: 100%;
  margin: 0;
}
#app {
  height: 100%;
  width: 100%;
}
</style>
