'use strict';

$().ready(function() {
  var episodeMatches = window.location.pathname.match(/\/episodes\/(\d+)/);
  var episode = episodeMatches ? 'episode:' + episodeMatches[1] : 'home';

  function logEvent(category, action, label, value, interaction) {
    if (interaction === undefined) {
      interaction = true;
    }
    window.gtag('event', action, {
      non_interaction: !interaction,
      event_category: category,
      event_label: label,
      value: value,
    });
  }

  logEvent('view', 'page', episode);

  $('#audioPlayer')
    .on('play', function(event) {
      logEvent('audio', 'play', episode);
    })
    .on('pause', function(event) {
      logEvent('audio', 'pause', episode);
    })
    .on('loadedmetadata', function(event) {
      logEvent('audio', 'loadedmetadata', episode, undefined, false);
    })
    .on('loadeddata', function(event) {
      logEvent('audio', 'loadeddata', episode, undefined, false);
    })
    .on('canplay', function(event) {
      logEvent('audio', 'canplay', episode, undefined, false);
    })
    .on('canplaythrough', function(event) {
      logEvent('audio', 'canplaythrough', episode, undefined, false);
    })
    .on('waiting', function(event) {
      logEvent('audio', 'waiting', episode, undefined, false);
    })
    .on('playing', function(event) {
      logEvent('audio', 'playing', episode, undefined, false);
    })
    .on('seeking', function(event) {
      logEvent('audio', 'seeking', episode, undefined, false);
    })
    .on('seeked', function(event) {
      logEvent('audio', 'seeked', episode, undefined, false);
    })
    .on('ended', function(event) {
      logEvent('audio', 'ended', episode, undefined, false);
    });
  $('.platform-list a')
    .on('click', function(event) {
      logEvent('link', 'click', $(this).attr('href'));
    });
});
