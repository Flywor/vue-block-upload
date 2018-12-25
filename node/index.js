//express使用的是@4版本的。
var express = require('express');
//form表单需要的中间件。
var mutipart= require('connect-multiparty');

var mutipartMiddeware = mutipart();
var app = express();

//临时文件的储存位置
app.use(mutipart({uploadDir:'./temp'}));
//设置http服务监听的端口号。
app.set('port', 8888);
app.listen(app.get('port'),function () {
  console.log("Express started on http://localhost:"+app.get('port')+'; press Ctrl-C to terminate.');
});
//这里就是接受form表单请求的接口路径，请求方式为post。
app.post('/', mutipartMiddeware, function (req,res) {
  const { file } = req.files;
  const { chunked, chunk, fileName } = req.body;
  if (!chunked) {
    // 目标目录
    var time = new Date();
    var path = [
      './upload/',
      time.getFullYear(),
      time.getMonth() + 1 <= 9 ? '0' + (time.getMonth() + 1) : time.getMonth() + 1,
      time.getDate() + 1 <= 9 ? '0' + (time.getDate() + 1) : time.getDate() + 1,
    ].join('');// 文件目录名
    // 如果没有des_dir目录,则创建des_dir
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
    fs.renameSync(file.path, `${path}/${file.originalFilename}`);
    res.send(true);
    return;
  }
  const tempFileDir = `./temp/${fileName.split('.')[0]}`;
  mkdirsSync(tempFileDir);

  console.log(`接收文件===>>> ${chunk}`)
  fs.renameSync(file.path, `${tempFileDir}/${chunk}`);

  let nextChunk = Number(chunk) + 1;
  while(fs.existsSync(`${tempFileDir}/${nextChunk}`)) {
    console.log(`跳过接收===>>> ${nextChunk}`)
    nextChunk++;
  }
  
  // 返回下一块序列
  res.send(`${nextChunk}`);
});

// 合并文件，校验文件的完整性
app.post('/validateFile', function (req, res) {
  var str="";
  req.on("data", function(chunk){
      str += chunk;
  })
  req.on("end", function(){
    const data = JSON.parse(str);
    // 分片目录
    var src_dir = `./temp/${data.fileName.split('.')[0]}/`;
    // 目标目录
    var time = new Date();
    var path = [
      './upload/',
      time.getFullYear(),
      time.getMonth() + 1 <= 9 ? '0' + (time.getMonth() + 1) : time.getMonth() + 1,
      time.getDate() + 1 <= 9 ? '0' + (time.getDate() + 1) : time.getDate() + 1,
    ].join('');// 文件目录名
    // 如果没有des_dir目录,则创建des_dir
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
    // 文件名+扩展名
    var name = data.fileName;
    // 文件的实际路径
    var des_path = [path, name].join('/');
    var files = fs.readdirSync(src_dir);
    if (files.length == 0) {
      return res.json({'status': 0, 'url': '', 'msg': '分片文件不存在!'});
    }
    if (files.length > 1) {
      files.sort(function (x, y) {
          return x - y;
      });
    }
    for (var i = 0, len = files.length; i < len; i++) {
      console.log(`合并文件块===>>> ${i}`)
      fs.appendFileSync(des_path, fs.readFileSync(src_dir + files[i]));
    }
    res.send(true);
  })
});

// 递归创建目录 同步方法
const fs = require('fs');
const path = require("path");
function mkdirsSync(dirname) {
  if (fs.existsSync(dirname)) {
    return true;
  } else {
    if (mkdirsSync(path.dirname(dirname))) {
      fs.mkdirSync(dirname);
      return true;
    }
  }
}