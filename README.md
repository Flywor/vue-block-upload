# vue-block-upload
基于vue的上传组件

###
![example](https://github.com/Flywor/vue-block-upload/blob/master/ex/ex0.gif)

## Install
```
npm install vue-block-upload
```

## Use
```
import VueBlockUpload from 'vue-block-upload'
import 'vue-block-upload/dist/vue-block-upload.css'
Vue.use(VueBlockUpload)
```

## Develop
```
npm install
npm run serve
```

## 功能
- 单文件/多文件选择
- 大文件分片上传-合并校验
- 上传选择的文件限制-基于input[type="file"] accept
- 图片预览 `blob`

## 未完成
- autoUpload
- 暂停上传

## 依赖
- vue 2.0+
- axios 0.18+

## 插槽slot
- `slot="select-btn"` 选择文件按钮

- `slot="file-list"  slot-scope="{ list, remove }"` 文件列表 scope: list 文件列表，包含了状态、进度等拓展信息， remove 删除方法，需传入当前文件对象和index

- `slot="upload-btn" slot-scope="{ handlerStartUpload }"` 上传按钮  handlerStartUpload： 开始上传方法

## 事件event
- `@on-file-change(fileList)` 选择文件发生变化时调用
- `@on-success` 上传成功调用
- `@on-error(Error)` 上传失败调用

## 参数
```
  props: {
    // 是否可多选
    multiple: {
      type: Boolean,
      default: true
    },
    // 等同input[type="file"] accept
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
    // 提交的文件地址
    postUrl: {
      type: String,
      default: 'http://localhost:8888'
    },
    // 验证合并文件块地址
    validateUrl: {
      type: String,
      default: 'http://localhost:8888/validateFile'
    }
  }
  ```
