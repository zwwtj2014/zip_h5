
var $uploader = {};
$uploader.currentInput = null;

$uploader.fileChoose =  function (obj) {
  var obj = arguments[0] ? arguments[0] : {accept: "*/*"}; 
  if ($uploader.currentInput) {  
    document.body.removeChild($uploader.currentInput);  
    $uploader.currentInput = null;  
  }

  return new Promise((resolve, reject) => {
      let input = document.createElement("input");
      input.type = "file";
      input.accept = obj.accept;
      input.style.display = "none";
      input.id = "tmp_file_window";
      
      $uploader.currentInput = input;
      
      input.onclick=function(){
        event.stopPropagation();
      }


      input.onchange = async function () {
        if (obj.onchange) obj.onchange();
        var _input = this;
        var file = _input.files[0];
        resolve(file);
      };
      
      document.body.appendChild(input);
      setTimeout(function () {
      input.click();
      }, 100);
    });
  };

$uploader.fileChooseMultiple =  function (obj) {
  var obj = arguments[0] ? arguments[0] : {accept: "*/*"};//image/*,video/*
  return new Promise((resolve, reject) => {
    let input = document.createElement("input");
    input.type = "file";
    input.accept = "text/plain";
    input.style.display = "none";
    input.multiple = "multiple";
    input.onclick=function(){
      event.stopPropagation();
    }
    input.onchange = async function () {
    if (obj.onchange) obj.onchange();
    var _input = this;
    resolve(_input.files);
    };
    document.body.appendChild(input);
    setTimeout(function () {
    input.click();
    }, 100);
  });
};

$uploader.get_frame = function (file) {
  // 氓藛鈥好ヂ宦好ㄢ劉拧忙鈥古该♀€瀡ideo氓鈥ζ捗� 
  const videoElement = document.createElement('video');
  videoElement.preload = 'metadata';
  // 氓藛鈥好ヂ宦好ㄢ劉拧忙鈥古该♀€瀋anvas氓鈥ζ捗� 
  const canvasElement = document.createElement('canvas');
  const canvasContext = canvasElement.getContext('2d');

  // 莽鈥衡€樏ヂ惵瑅ideo氓鈥ζ捗� 莽拧鈥瀕oadedmetadata盲潞鈥姑ぢ宦�
  videoElement.addEventListener('loadedmetadata', function() {
    // 猫庐戮莽陆庐canvas莽拧鈥灻ヂぢヂ奥徝ぢ宦ッヅ捖姑┾€β嵜р€犆┞⑩€樏♀€灻ヂ奥好ヂ�
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;

    // 莽禄藴氓藛露猫搂鈥犆┞⑩€樏♀€灻ぢ糕偓氓赂搂氓藛掳canvas
    canvasContext.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

    // 猫沤路氓聫鈥撁凰溍ニ喡睹♀€灻モ€郝久テ捖徝︹€⒙懊β嵚甎RL
    const firstFrameDataURL = canvasElement.toDataURL('image/jpeg');
    const durationInSeconds = videoElement.duration;
      // 氓艙篓猫驴鈩⒚┾€∨捗ぢ� 氓聫炉盲禄楼盲陆驴莽鈥澛╠urationInSeconds茂录艗氓聫炉猫茠陆茅艙鈧β伱库€好∨捗� 录氓录聫氓艗鈥�
    console.log('猫搂鈥犆┞⑩€樏︹€斅睹┾€⒙棵妓喢р€櫭尖€懊寂�', durationInSeconds);

    // 氓艙篓猫驴鈩⒚┾€∨捗ぢ� 氓聫炉盲禄楼盲陆驴莽鈥澛� firstFrameDataURL
    console.log('莽卢卢盲赂鈧ヂ嘎モ€郝久р€扳€∶♀€灻︹€⒙懊β嵚甎RL茂录拧', firstFrameDataURL);
  });
  videoElement.src = URL.createObjectURL(file);
};


$uploader.get_duration =  function (file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = function() { 
      const durationInSeconds = video.duration;
      // 氓艙篓猫驴鈩⒚┾€∨捗ぢ� 氓聫炉盲禄楼盲陆驴莽鈥澛╠urationInSeconds茂录艗氓聫炉猫茠陆茅艙鈧β伱库€好∨捗� 录氓录聫氓艗鈥�
      console.log('猫搂鈥犆┞⑩€樏︹€斅睹┾€⒙棵妓喢р€櫭尖€懊寂�', durationInSeconds);
      resolve(durationInSeconds);
    };
    video.src = URL.createObjectURL(file);
    video.onerror = function(e) {
      console.log(e);
      console.error('忙鈥� 忙鲁鈥⒚ヅ� 猫陆陆猫搂鈥犆┞⑩€樏︹€撯€∶ぢ宦睹ｂ偓鈥�');
    };
    setTimeout(function(){
      resolve(1);
    },2000);
  });
};
$uploader.get_md5 =  function (file) {
  return new Promise((resolve, reject) => {
    var chunkSize = 64 * 1024; // 64 KB
    var spark = new SparkMD5.ArrayBuffer();
    var fileReader = new FileReader();

    let cursor = 0; // 忙鈥撯€∶ぢ宦睹幻ヂ忊€撁ぢ铰嵜铰�

    fileReader.onload = function(e) {
    spark.append(e.target.result); // 莽麓炉氓艩 忙鈥撯€∶ぢ宦睹モ€犫€γヂ姑ニ喡皊park
    processFile(); // 莽禄搂莽禄颅氓陇鈥灻愨€犆︹€撯€∶ぢ宦�
    };

    fileReader.onerror = function() {
    console.error('忙鈥撯€∶ぢ宦睹幻ヂ忊€撁┾€濃劉猫炉炉');
    };

    function processFile() {
    var fileSlice = file.slice(cursor, cursor + chunkSize);
    fileReader.readAsArrayBuffer(fileSlice);
    cursor += chunkSize;
    if (cursor >= file.size) {
      var md5Hash = spark.end(); // 忙鈥撯€∶ぢ宦睹幻ヂ忊€撁ヂ捗β€⒚寂捗ヂ锯€斆ニ喡癕D5
      resolve(md5Hash);
    }
    }
    processFile(); 
  });
};

$uploader.fileToBuffer = function (file) {
  var media_type = 'application/octet-stream';
  var media_types = [
    'application/octet-stream',
    'text/txt','text/csv','text/css','text/html','text/js',
    'application/zip','application/pdf','application/doc',
    'image/png','image/jpeg','image/jpg','image/gif',
    'audio/kgm','audio/mp3','audio/wav'
    
  ];
  if (file.name.indexOf('.html')>-1) {
    media_type = 'text/html';
  }
  if (file.name.indexOf('.js')>-1) {
    media_type = 'text/js';
  }
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.addEventListener("load", function (e) {
      var data = new Uint8Array(e.target.result);
      reader = null;
      resolve({ name:file.name,size:file.size,data: data, mime: media_type,suffix:file.name.substr(file.name.lastIndexOf('.')).toLowerCase()});
    });
    reader.readAsArrayBuffer(file);
  });
};
$uploader.getProtocol = function(){
  return window.location.protocol.indexOf('https')>-1?'https:':'http:';
}
$uploader.isExistFile = async function (file_url) {
  return new Promise((resolve, reject) => {
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
      if (request.readyState === XMLHttpRequest.DONE) {
        var status = request.status;
        if (status === 200) {
          console.log('200');
          resolve(true);
        } else if (status === 404) {
          resolve(false);
          console.log('404');
        } else {
          resolve(false);
          console.log('other');
        }
      }
    };
    request.open('HEAD', file_url, true);
    request.send();
  });
};
$uploader.uploadFile = async function (obj) {//obj.mine,obj.data,obj.filename,obj.onProgress
  var http_get=function(req){return new Promise((resolve,reject)=>{var xhr=new XMLHttpRequest();xhr.ontimeout=function(e){resolve('');xhr.abort();};xhr.onerror=function(e){resolve('');};xhr.open("GET",req.url,true);xhr.onreadystatechange=function(){if(xhr.readyState==4){resolve(xhr.responseText);}};xhr.timeout=1500;xhr.send();});};
  var mime = obj.mime ? obj.mime : "image/png";
  var file_data = obj.data;
  var onProgress = obj.onProgress || function() {}; // 添加进度回调参数
  var oss_text = await http_get({url:$uploader.getProtocol() +"//www.xiexinbao.com/oss_hz/params?mime=" +mime +"&filename=" +(obj.filename || "")});
  if (oss_text.indexOf('{')==-1) {
    oss_text = await http_get({url:$uploader.getProtocol() +"//www.xiexinbao.com/oss_hz/params?mime=" +mime +"&filename=" +(obj.filename || "")});
  }
  if (oss_text.indexOf('{')==-1) {
    alert('氓鈥郝久р€扳€∶ぢ概犆ぢ� 氓陇卤猫麓楼茂录聛')
    return;
  }	
  var oss = JSON.parse(oss_text);
  
  //氓鈥λ喢ニ喡っ︹€撀λ溌ヂ惵γヂ溍ヅ撀寂捗ヂ溍ヅ撀ヂ奥泵ぢ嘎嵜ぢ概犆ぢ� 盲潞鈥�
  var file_url = 'https://' +oss.host + "/" +oss.filename;
  
  async function oss_http_put(){
    return new Promise((resolve, reject) => {
      var loadstart_flag = false;
      try {
        const request = new XMLHttpRequest();
        request.upload.onloadstart = function(){
          loadstart_flag = true;
          //猫露鈥γ库€�1s茂录艗氓掳卤氓戮鈥斆┾€÷嵜︹€撀懊ヂ孤裁ぢ糕偓茅聛聧
          console.log('Upload started');
        };
        request.upload.onprogress = function(evt){
          if (evt.lengthComputable) {
            const percentComplete = Math.round(evt.loaded / evt.total * 100);
            
            // 调用进度回调
            onProgress(percentComplete);
            
            // 保留原有 DOM 更新（兼容旧代码）
            if(document.querySelector("#progress_status")) {
              document.querySelector("#progress_status").innerHTML = percentComplete + "%";
            }
          }
        }
        request.onload = function(){
          console.log('Upload completed');
          resolve(file_url);
        };
        request.ontimeout = function (e) {
          resolve("");
        };
        request.onerror = function (e) {
          resolve("");
        };
        request.open("PUT",file_url);
        request.setRequestHeader("authorization", oss.authorization);
        request.setRequestHeader("Content-Type", oss.mime); 
        request.setRequestHeader("x-oss-date", oss.date); 
        request.timeout = 30 * 60 * 1000;
        request.send(file_data);
        
        setTimeout(function(){
          if(loadstart_flag==false){
            resolve('unloadstart');
            request.abort();
          }
        },1000);
      } catch (e) {
        resolve("");
      }
    });
  }
  
  var result = await oss_http_put();
  if(result=='unloadstart') {
    result = await oss_http_put();
  }
  if(result=='unloadstart') {
    result = '';
  }
  return result;
}