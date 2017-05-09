/*!
 * io.js v0.1.0
 * @snandy 2016-01-06 10:06:57
 *
 */
~function(window, undefined) {

	var IO = {}
	var toString = Object.prototype.toString

	// Iterator
	function forEach(obj, iterator, context) {
		if (!obj) return 
		if ( obj.length && obj.length === +obj.length ) {
			for (var i=0; i<obj.length; i++) {
				if (iterator.call(context, obj[i], i, obj) === true) return
			}
		} else {
			for (var k in obj) {
				if (iterator.call(context, obj[k], k, obj) === true) return
			}
		}
	}

	// IO.isArray, IO.isBoolean, ...
	forEach(['Array', 'Boolean', 'Function', 'Object', 'String', 'Number'], function(name) {
		IO['is' + name] = function(obj) {
			return toString.call(obj) === '[object ' + name + ']'
		}
	})

	// Object to queryString
	function serialize(obj) {
		var a = []
		forEach(obj, function(val, key) {
			if ( IO.isArray(val) ) {
				forEach(val, function(v, i) {
					a.push( key + '=' + encodeURIComponent(v) )
				})
			} else {
				a.push(key + '=' + encodeURIComponent(val))
			}
		})
		return a.join('&')
	}

	// Parse json string
	function parseJSON(str) {
		try {
			return JSON.parse(str)
		} catch(e) {
			try {
				return (new Function('return ' + str))()
			} catch(e) {
			}
		}
	}
		
	// Empty function
	function noop() {}


	/**
	 *  Ajax API
	 *     IO.ajax, IO.get, IO.post, IO.text, IO.json, IO.xml
	 *  
	 */
	~function(IO) {
		
		var createXHR = window.XMLHttpRequest ?
			function() {
				return new XMLHttpRequest()
			} :
			function() {
				return new window.ActiveXObject('Microsoft.XMLHTTP')
			}
			
		function ajax(url, options) {
			if ( IO.isObject(url) ) {
				options = url
				url = options.url
			}
			var xhr, isTimeout, timer, options = options || {}
			var async      = options.async !== false,
				method     = options.method  || 'GET',
				type       = options.type    || 'text',
				encode     = options.encode  || 'UTF-8',
				timeout    = options.timeout || 0,
				credential = options.credential,
				data       = options.data,
				scope      = options.scope,
				success    = options.success || noop,
				failure    = options.failure || noop
			
			// 大小写都行，但大写是匹配HTTP协议习惯
			method  = method.toUpperCase()
			
			// 对象转换成字符串键值对
			if ( IO.isObject(data) ) {
				data = serialize(data)
			}
			if (method === 'GET' && data) {
				url += (url.indexOf('?') === -1 ? '?' : '&') + data
			}
			
			xhr = createXHR()
			if (!xhr) {
				return
			}
			
			isTimeout = false
			if (async && timeout>0) {
				timer = setTimeout(function() {
					// 先给isTimeout赋值，不能先调用abort
					isTimeout = true
					xhr.abort()
				}, timeout)
			}
			xhr.onreadystatechange = function() {
				if (xhr.readyState === 4) {
					if (isTimeout) {
						failure(xhr, 'request timeout')
					} else {
						onStateChange(xhr, type, success, failure, scope)
						clearTimeout(timer)
					}
				}
			}
			xhr.open(method, url, async)
			if (credential) {
				xhr.withCredentials = true
			}
			if (method == 'POST') {
				xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded;charset=' + encode)
			}
			xhr.send(data)
			return xhr
		}
		
		function onStateChange(xhr, type, success, failure, scope) {
			var s = xhr.status, result
			if (s>= 200 && s < 300) {
				switch (type) {
					case 'text':
						result = xhr.responseText
						break
					case 'json':
						result = parseJSON(xhr.responseText)
						break
					case 'xml':
						result = xhr.responseXML
						break
				}
				// text, 返回空字符时执行success
				// json, 返回空对象{}时执行suceess，但解析json失败，函数没有返回值时默认返回undefined
				result !== undefined && success.call(scope, result, s, xhr)
				
			} else {
				failure(xhr, xhr.status)
			}
			xhr = null
		}
		
		// exports to IO
		var api = {
			method: ['get', 'post'],
			type: ['text','json','xml'],
			async: ['sync', 'async']
		}
		
		// Low-level Interface: IO.ajax
		IO.ajax = ajax
		
		// Shorthand Methods: IO.get, IO.post, IO.text, IO.json, IO.xml
		forEach(api, function(val, key) {
			forEach(val, function(item, index) {
				IO[item] = function(key, item) {
					return function(url, opt, success) {
						if ( IO.isObject(url) ) {
							opt = url
						}
						if ( IO.isFunction(opt) ) {
							opt = {success: opt}
						}
						if ( IO.isFunction(success) ) {
							opt = {data: opt}
							opt.success = success
						}
						if (key === 'async') {
							item = item==='async' ? true : false
						}
						opt = opt || {}
						opt[key] = item
						return ajax(url, opt)
					}
				}(key, item)
			})
		})

	}(IO)

	/**
	 *  JSONP API
	 *  IO.jsonp
	 *  
	 */
	~function(IO) {
		
		var ie678 = !-[1,]
		var win = window
		var opera = win.opera
		var doc = win.document
		var head = doc.head || doc.getElementsByTagName('head')[0]
		var timeout = 3000 
		var done = false
		
		// Thanks to Kevin Hakanson
		// http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/873856#873856
		function generateRandomName() {
			var uuid = ''
			var s = []
			var i = 0
			var hexDigits = '0123456789ABCDEF'
			for (i = 0; i < 32; i++) {
				s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1)
			}
			// bits 12-15 of the time_hi_and_version field to 0010
			s[12] = '4'
			// bits 6-7 of the clock_seq_hi_and_reserved to 01  
			s[16] = hexDigits.substr((s[16] & 0x3) | 0x8, 1)
			uuid = 'jsonp_' + s.join('')
			return uuid
		}
		
		function jsonp(url, options) {
			if ( IO.isObject(url) ) {
				options = url;
				url = options.url;
			}
			var options = options || {}
			var me      = this
			var url     = url.indexOf('?') === -1 ? (url + '?') : (url + '&')
			var data    = options.data
			var charset = options.charset
			var success = options.success || noop
			var failure = options.failure || noop
			var scope   = options.scope || win
			var timestamp = options.timestamp
			var jsonpName = options.jsonpName || 'callback'
			var callbackName = options.jsonpCallback || generateRandomName()
			
			if ( IO.isObject(data) ) {
				data = serialize(data)
			}
			var script = doc.createElement('script')
			
			function callback(isSucc) {
				if (isSucc) {
					done = true
				} else {
					failure.call(scope)
				}
				// Handle memory leak in IE
				script.onload = script.onerror = script.onreadystatechange = null
				if ( head && script.parentNode ) {
					head.removeChild(script)
					script = null
					win[callbackName] = undefined
				}
			}
			function fixOnerror() {
				setTimeout(function() {
					if (!done) {
						callback()
					}
				}, timeout)
			}
			if (ie678) {
				script.onreadystatechange = function() {
					var readyState = this.readyState
					if (!done && (readyState == 'loaded' || readyState == 'complete')) {
						callback(true)
					}
				};
				
			} else {
				script.onload = function() {
					callback(true)
				}
				script.onerror = function() {
					callback()
				}
				if (opera) {
					fixOnerror()
				}
			}
			
			url += jsonpName + '=' + callbackName
			
			if (charset) {
				script.charset = charset
			}
			if (data) {
				url += '&' + data
			}
			if (timestamp) {
				url += '&ts='
				url += (new Date).getTime()
			}
			
			win[callbackName] = function(json) {
				success.call(scope, json)
			};
			
			script.src = url
			head.insertBefore(script, head.firstChild)
		}
		
		// exports to IO
		IO.jsonp = function(url, opt, success) {
			
			if ( IO.isObject(url) ) {
				opt = url
			}
			if ( IO.isFunction(opt) ) {
				opt = {success: opt}
			}
			if ( IO.isFunction(success) ) {
				opt = {data: opt}
				opt.success = success
			}
			
			return jsonp(url, opt)
		}

	}(IO)


	// Expose IO to the global object or as AMD module
	if (typeof define === 'function' && define.amd) {
		define('IO', [], function() { return IO } )
	} else {
		window.IO = IO
	}

}(this);


var $ = function(selector, parent){
	return (parent || document).querySelector(selector);
};
var $$ = function(selector, parent){
	return (parent || document).querySelectorAll(selector);
};

window.webbb = function(obj){
	alert(obj);
	//$('.btn-reward').innerHTML = obj;
};


;(function(){

	var doc = document,
		tabs = $$('nav li'),
		divs = $$('article section'),
		curname1 = '',
		curname2 = '',
		tabClick = function(){
			for(var i=0; i<tabs.length; i++){
				tabs[i].onclick=function(){
					change(this,curname1,curname2);
				};
			}
		},
		change = function(obj,curname1,curname2){
			for(var i=0; i<tabs.length; i++){
				if(tabs[i]==obj){
					tabs[i].className = 'cur';
					divs[i].className = curname1;
				}else{
					tabs[i].className = '';
					divs[i].className = curname2;
				}
			}
		};


	if( !$('.contbox') ){
		curname1 = 'ztbox';
		curname2 = 'ztbox hidden';
		tabClick();
	}

	if( !$('.ztbox') ){
		curname1 = 'contbox';
		curname2 = 'contbox hidden';
		tabClick();
	}

	var award = doc.getElementById('award'),
		GetQueryString = function (name){
		     var reg = new RegExp("(^|&)"+ name +"=([^&]*)(&|$)");
		     var r = window.location.search.substr(1).match(reg);
		     if(r!=null)return  unescape(r[2]); return null;
		},
		awardFun = {

			link : '//m.hd.2144.cn/act/award/cashbonuscenter',
			uuid : GetQueryString('uuid'),
			// slug : GetQueryString('slug'),
			os_type : GetQueryString('os_type'),

			Check : function(){

				// var _url = '//m.hd.2144.cn/act/award/check?uuid='+awardFun.uuid+'&slug='+awardFun.slug+'&os_type='+awardFun.os_type;
				var _url = '//m.hd.2144.cn/act/award/check?uuid='+awardFun.uuid+'&slug=ssmtl&os_type='+awardFun.os_type;

					IO.jsonp(_url,function(data){

							if(data.errno == 0){//可领取
								award.innerHTML = '<span class="rw-get_yes">领取红包</span>';
								awardFun.inIt();

							}else if(data.errno == 1){//已领取
								award.innerHTML = '<a class="rw-get_see" href="'+awardFun.link+'">查看红包</a>';

							}else{//不满足领取条件
								award.innerHTML = '<span class="rw-get_no">未满足要求</span>';
							}

					});

			},

			isError : true,

			inIt : function(){

				// var _getUrl = '//m.hd.2144.cn/act/award/cashbonus?slug='+awardFun.slug+'&uuid='+awardFun.uuid+'&os_type='+awardFun.os_type;
				var _getUrl = '//m.hd.2144.cn/act/award/cashbonus?slug=ssmtl&uuid='+awardFun.uuid+'&os_type='+awardFun.os_type;

				award.addEventListener('click',function(e){

						var target = e.target;

						if(!awardFun.isError){
							return;
						}
						
						awardFun.isError = false;

						if(target.className == 'rw-get_yes'){

							IO.jsonp(_getUrl,function(data){
								if(data.errno == 0){//领取成功
									window.location.replace(awardFun.link);

								}else{
									alert(data.msg);
								}

								awardFun.isError = true;

							});

						}
					
				},false);

			}


		};

	if( award != 'undefined' ){
		awardFun.Check();
	}



	var shareUrl = '//m.hd.2144.cn/sdk/api2/getshareconf?slug=ssmtl';

	if( $('.btn-share') ){
		$('.btn-share').addEventListener('click',function(){

			alert('111');

			window.location.href = 'sharesocial:'+shareUrl;

		});
	}


	// var webaa = {
	// 	uid : '333'
	// }

	// webbb(webaa);




	// window.webbb



	// alert(webaa);

}());
