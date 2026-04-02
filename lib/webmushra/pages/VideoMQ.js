/*************************************************************************
         (C) Copyright AudioLabs 2017 

This source code is protected by copyright law and international treaties. This source code is made available to You subject to the terms and conditions of the Software License for the webMUSHRA.js Software. Said terms and conditions have been made available to You prior to Your download of this source code. By downloading this source code You agree to be bound by the above mentionend terms and conditions, which can also be found here: https://www.audiolabs-erlangen.de/resources/webMUSHRA. Any unauthorised use of this source code may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under law. 

**************************************************************************/
function shuffle(a) {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}

function VideoMQ(
  _pageManager,
  _pageTemplateRenderer,
  _session,
  _config,
  _pageConfig,
  _errorHandler,
  _language
) {
  this.isMushra = false;
  this.pageManager = _pageManager;
  this.pageTemplateRenderer = _pageTemplateRenderer;
  this.session = _session;
  this.config = _config;
  this.pageConfig = _pageConfig;
  this.errorHandler = _errorHandler;
  this.language = _language;
  this.div = null;
  this.videoVisualizer = null;
  this.interactionTracker = [];
  this.watched = false;
  this.answer = 0;
  this.currentItem = null;
  this.playedStimuli = [];
  this.tdLoop2 = null;
  this.reportButtonUnlockTimeout = 5000; // milliseconds

  this.conditions = [];
  this.questions = [];

  function newStimulus(i, key, video, atVal) {
    var stimulus = new Stimulus(key, video);
    if (atVal) {
      stimulus.at = true;
      stimulus.atVal = atVal;
    }
    return stimulus;
  }

  var i = 0;
  for (var item in this.pageConfig.stimuli) {
    key = this.pageConfig.stimuli[item][0];
    stimuli = this.pageConfig.stimuli[item][1];
    if (key.search("_att_") != -1) {
      var stimulus = newStimulus(
        i,
        key,
        stimuli,
        true
      );
    } else {
      var stimulus = newStimulus(i, key, stimuli);
    }
    this.conditions[this.conditions.length] = stimulus;
    i++;
  }
    this.conditions = shuffle(this.conditions).slice(0,1);
  var n_questions = 0;
  for (var item in this.pageConfig.question) {
    key = this.pageConfig.question[item][0];
    text = this.pageConfig.question[item][1];
    
    var q = new Question( key,this.conditions[0],text);
    
    this.questions[this.questions.length] = q;
    n_questions++;
  }


  // data
  this.ratings = [];

  this.time = 0;
  this.startTimeOnPage = null;
}

VideoMQ.prototype.getName = function () {
  return this.pageConfig.name;
};

VideoMQ.prototype.init = function () {
  if (this.pageConfig.strict !== false) {
    this.checkNumConditions(this.conditions);
  }
};
function createXPathFromElement(elm) { 
  var allNodes = document.getElementsByTagName('*'); 
  for (var segs = []; elm && elm.nodeType == 1; elm = elm.parentNode) 
  { 
      if (elm.hasAttribute('id')) { 
              var uniqueIdCount = 0; 
              for (var n=0;n < allNodes.length;n++) { 
                  if (allNodes[n].hasAttribute('id') && allNodes[n].id == elm.id) uniqueIdCount++; 
                  if (uniqueIdCount > 1) break; 
              }
              if ( uniqueIdCount == 1) { 
                  segs.unshift('id(' + elm.getAttribute('id') + ')'); 
                  return segs.join('/'); 
              } else { 
                  segs.unshift(elm.localName.toLowerCase() + '[@id=' + elm.getAttribute('id') + ']'); 
              } 
      } else if (elm.hasAttribute('class')) { 
          segs.unshift(elm.localName.toLowerCase() + '[@class=' + elm.getAttribute('class') + ']'); 
      } else { 
          for (i = 1, sib = elm.previousSibling; sib; sib = sib.previousSibling) { 
              if (sib.localName == elm.localName)  i++; }
              segs.unshift(elm.localName.toLowerCase() + '[' + i + ']'); 
      }
  }
  return segs.length ? '/' + segs.join('/') : null;
}

VideoMQ.prototype.render = function (_parent) {
  var div = $("<div></div>");
  var global = this;
  _parent.append(div);
  var content;
  if (this.pageConfig.content === null) {
    content = "";
  } else {
    content = this.pageConfig.content;
  }

  var p = $("<p>" + content + "</p>");


  var interactionTracker = this.interactionTracker;

  function track(type_, el, extra) {
    var t = (new Date().getTime()) / 1000;
    interactionTracker.push([type_, el, t, extra]);
  }

  function recordEvent(e) {
    track(e.type, createXPathFromElement(e.target));
  }

  $(div).on("click", recordEvent);
  for (j=0; j< this.questions.length; j++) {
  global.ratings.push({name: global.questions[j].getId(), value: null});
  }

  var n_choices = 5;
  var names = ['Strongly Disagree', 'Disagree', 'Neither Agree or Disagree', 'Agree', 'Strongly Agree'];
  

  div.append(p);
  /* We always put video1 on the left and video2 on the right */
  this.videoVisualizer = new VideoMQVisualizer(div, this.conditions);
  this.videoVisualizer.addEventListener(
    function (_event) {
      if (_event.name == "playConditionTriggered") {
        var index = _event.index;
        track("play_video", "video_" + index, _event.seconds);
        if(this.playedStimuli.includes(_event.index) === false){
            this.playedStimuli.push(_event.index);
            
        }
        if(this.playedStimuli.length >= 1) {
            this.watched = true;
           
        }
      } else if (_event.name == "pauseTriggered") {
        track("pause_video", "video_" + _event.index, _event.seconds);
      }
    }.bind(this)
  );

  for (let j=0; j< this.questions.length; j++) {

  var cb = $(`<div id='video-checkbox${j}'></div>`);

  var questionLabel = $(`<span class="question-label">${this.questions[j].getText()}</span>`);
cb.append(questionLabel);
cb.append("&nbsp;&nbsp;"); // spacing
  var radio_buttons = [];

  for (let i = 0; i < n_choices; ++i) {
    var choice = $(`<label class="radio-inline"><input type='radio' id='video${i}_question${j}' name='selection${j}'>${names[i]}</label>`);
    choice.click(function(){
          global.ratings[j].value = 2 - i;
          console.log(`Server at port ${j}`);
          if (global.questions[j].isAnswered()) {
            global.answer++;
            global.questions[j].setAnswered(true);
          }
          if (global.answer >= global.questions.length && global.watched){
          global.pageTemplateRenderer.unlockNextButton();
          }
         
    });
    radio_buttons.push(choice);
  }
  div.append(cb);
  for (var i = 0; i < n_choices; ++i) {
    var cb_element = $(`<div id='cb${j}_${i}' class=inline-block></div>`);
    cb.append(cb_element);
    cb_element.append(radio_buttons[i]);

    if (i < n_choices - 1){
      cb.append("&nbsp;");
    }
  }
  }
};

VideoMQ.prototype.save = function () {
  this.time += new Date() - this.startTimeOnPage;
  var scales = $(".scales");
  var global = this;

  $.post("/partial", data={
      ratings: JSON.stringify(global.ratings),
      user_id: this.config.userId,
      test_id: this.config.testId,
      page_id: this.pageConfig.id,
      interaction: JSON.stringify($.extend(true,{},this.interactionTracker)),
      navigator: this.session.navigator
  });
};

VideoMQ.prototype.postCheck = function() {
  var atKey = null;
  var remoteFailService = this.config.remoteFailService;
  var userId = this.config.userId;
  var testId = this.config.testId;
  var session = this.session;
  var global = this;

  for (key in this.conditions) {
    if (this.conditions[key].at) {
      atKey = this.conditions[key].getId();
    }
  }

  if (atKey){
    var atTarget = 0
    if (atKey.includes('Strongly Disagree')){
      atTarget = 2;
    }else if (atKey.includes('Disagree')){
      atTarget = 1;
    }else if (atKey.includes('Neither Agree or Disagree')){
      atTarget = 0;
    }else if (atKey.includes('Agree')){
      atTarget = -1;
    }else if (atKey.includes('Strongly Agree')){
      atTarget = -2;
    }

    // console.log(atTarget);
    // console.log(global.ratings[0].value);
    if (atTarget != global.ratings[0].value) {
      this.pageManager.failedAttnChecks++;
      // console.log('attn failed');
    }
  }

  return this.pageManager.tryTerminateStudy(remoteFailService, userId, testId, session);

};

VideoMQ.prototype.load = function () {
  this.startTimeOnPage = new Date();
  this.pageTemplateRenderer.lockNextButton();
  this.pageTemplateRenderer.lockReportButton();
  var global = this;
  setTimeout(this.pageTemplateRenderer.unlockReportButton, global.reportButtonUnlockTimeout);
};

VideoMQ.prototype.store = function () {
  var trial = new Trial();
  trial.type = this.pageConfig.type;
  trial.id = this.pageConfig.id;
  trial.interaction = $.extend(true,{},this.interactionTracker);
  this.interactionTracker = [];
  var i;
  for (i = 0; i < this.ratings.length; ++i) {
    var rating = this.ratings[i];
    var ratingObj = new MUSHRARating();
    ratingObj.stimulus = rating.name;
    ratingObj.score = rating.value;
    ratingObj.time = this.time;
    trial.responses[trial.responses.length] = ratingObj;
  }
  this.session.trials[this.session.trials.length] = trial;
};

/** 
VideoMQ.prototype.render = function (_parent) {
    _parent.append(this.content);
    return;
};*/

VideoMQ.prototype.checkNumConditions = function (_conditions) {
  if (_conditions.length > 8) {
    this.errorHandler.sendError("Number of conditions must be no more than 6.");
    return false;
  }
  return true;
};
