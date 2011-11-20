var util = require('util')
var wts = require('wts');
var Command = wts.Command
var RWFile = wts.RWFile
var OutputSequencer = wts.OutputSequencer
var MyProcess = wts.MyProcess

//Helper command; eases in output-ing
var Echo = function(args){
	Echo.super_.call(this, args)
}

util.inherits(Echo, Command);

Echo.prototype.execute = function(){	
	var self = this;
	self.output(self.getArgument('message'));
	self.end()
}

var iWeYou = function(name, groupName){
	//console.log('iWeYou name = '+name)
	iWeYou.super_.call(this, {name: name, groupName: groupName})
}

util.inherits(iWeYou, Command)

iWeYou.prototype.execute = function (){
	this._os = new OutputSequencer(this.process.stdout)
	//if groupName argument is set; it will be used here
	var g = this.getArgument('groupName')
	if(g){
		this._os.add(new Echo({message: '<div class="'+g+'">'}).run({stdout: new RWFile()}))		
	}
	this.input()
}

iWeYou.prototype.configure = function (){
	throw new Exception('Configure needs to be overridden')
}

iWeYou.prototype.onStdInput = function(data){
	var conf = this.configure() //Abstract method to recieve configuration from sub-classes
	this._os.add(new Echo({message: '<div class="'+this.getArgument('name')+'">'}).run({stdout: new RWFile()}))
	for(k in conf){
		c = conf[k]
		d = data[k]
		var f = new RWFile()
		//if d is a process; use it as stdin
		if(d instanceof MyProcess){
			d.on('data', function(file){
				return function(data){
					file.write(data)
				}
			}(f))
			d.on('end', function(file){
				return function(){
					file.end()
				}
			}(f))
			d.resume()
		}
		else{
			f.write(d)
			f.end()			
		}
		if(c.view instanceof iWeYou){
			//it is a subview;
			var p = c.view.run({stdin: f, stdout: new RWFile()})
		}
		else{
			//its a normal html tag
			var p = new Html(c.view).run({stdin: f, stdout: new RWFile()})
		}		
		this._os.add(p)
	}
	this._os.add(new Echo({message: '</div class="'+this.getArgument('name')+'">'}).run({stdout: new RWFile()}))
}

/*
Overriding Command.end because 
1) end will be called when stdin ends
2) iWeYou will end only when its OutputSequencer ends
*/
iWeYou.prototype.end = function(){
	//console.log('ivu ends' + this.getArgument('name'))
	var self = this
	this._os.on('end', function(){
		//console.log('os ends')
		if(self.process.stdout != process.stdout){
			self.process.stdout.end();
		}
		//Currently no one listens to this event //TODO: emit end when stdout ends. Process will listen to ths event
		self.emit('end')		
	})
	var g = this.getArgument('groupName')
	if(g){
		this._os.add(new Echo({message: '</div>'}).run({stdout: new RWFile()}))		
	}
	this._os.end()
}

var Html = function(tag){
	Html.super_.call(this, {tag: tag})
}

util.inherits(Html, Command)

Html.prototype.execute = function(){
	this.input()
}

Html.prototype.onStdInput = function(data){
	var t = this.getArgument('tag')
	var ret = '<' + t + '>\n' + data + '</' + t + '>\n'
	this.output(ret)
}

exports.iWeYou = iWeYou