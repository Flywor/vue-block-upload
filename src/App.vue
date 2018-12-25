<template>
  <div id="app">
    <VueUpload></VueUpload>
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
