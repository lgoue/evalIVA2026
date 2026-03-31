function VideoMQVisualizer(_parent, _conditions) {
  this.parent = _parent;
  this.conditions = _conditions;
  this.eventListeners = [];
  this.currentVideo = null;
  this.currentVideoIndex = null;

  this.conditions = _conditions;

  var mainDiv = $('<div id="main-video-frame-pc" ></div>');
  var _videoElements = [];

  var self = this;
  this.conditions.forEach(function(i, index){
    var vid = $("<div id='video_" + index + " style='display:flex; justify-content:center; width:100%; margin-top:20px;' '/></div>");
    mainDiv.append(vid);
    _videoElements.push(vid);

    var player = new Vimeo.Player(vid, {url: i.getFilepath(), width: 600, dnt: true});
    player.on("pause", function(e) {
      self.sendEvent({
        name: "pauseTriggered",
        index: index,
        conditionLength: self.conditions.length,
        seconds: e.seconds
      });
    });

    player.on("play", function(e) {
      var event = {
        name: "playConditionTriggered",
        index: index,
        length: self.conditions.length,
        seconds: e.seconds
      };
      self.sendEvent(event);
    });
    player.on("ended", function(e) {
      var event = {
        name: "endConditionTriggered",
        index: index,
        length: self.conditions.length,
        seconds: e.seconds
      };
      self.sendEvent(event);
    });

  });

  this.videoElements = _videoElements;
  this.parent.append(mainDiv);
};

VideoMQVisualizer.prototype.playCondition = function (_index) {
  this.videoPlaceholder.get(0).style.display = "none";
  this.videoElements.forEach(function (videoElement, i) {
    if (i == _index) {
      videoElement.style.display = "block";
    } else {
      var player = new Vimeo.Player(videoElement);
      player.getPaused().then(function(paused) {
        if (!paused) {
          player.pause();
          player.setCurrentTime(0);
        }
      });
      videoElement.style.display = "block";
      videoElement.style.justifyContent = "center";
    }
  });
  this.currentVideo = this.videoElements[_index];
  this.currentVideoIndex = _index;

  (new Vimeo.Player(this.currentVideo)).play();

  return;
};

VideoMQVisualizer.prototype.pause = function () {
  (new Vimeo.Player(this.currentVideo)).pause();
  return;
};

VideoMQVisualizer.prototype.reload = function () {
  var conditions = this.conditions;
  this.videoElements.forEach(function (videoElement, i) {
    (new Vimeo.Player(videoElement)).loadVideo(conditions[i].getFilepath());
  });
  return;
};

VideoMQVisualizer.prototype.getConditions = function () {
  return this.conditions;
};

VideoMQVisualizer.prototype.removeEventListener = function (_index) {
  this.eventListeners[_index] = null;
};

VideoMQVisualizer.prototype.addEventListener = function (_listenerFunction) {
  this.eventListeners[this.eventListeners.length] = _listenerFunction;
  return this.eventListeners.length - 1;
};

VideoMQVisualizer.prototype.sendEvent = function (_event) {
  for (var i = 0; i < this.eventListeners.length; ++i) {
    if (this.eventListeners[i] === null) {
      continue;
    }
    this.eventListeners[i](_event);
  }
};
