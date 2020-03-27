'use strict';

$().ready(function() {
  var episodeMatches = window.location.pathname.match(/\/episodes\/(\d+)/);
  var episode = episodeMatches ? 'episode:' + episodeMatches[1] : 'home';

  function logEvent(category, action, label, value, interaction, customDimensions) {
    if (interaction === undefined) {
      interaction = true;
    }
    var dimensions = {
      non_interaction: !interaction,
      event_category: category,
      event_label: label,
      value: value
    };
    if (customDimensions !== undefined) {
      for (var key in customDimensions) {
        dimensions[key] = customDimensions[key];
      }
    }
    window.gtag('event', action, dimensions);
  }

  logEvent('page', 'view');

  $('.audio-bar')
    .on('play', function(event) {
      logEvent('audio', 'play');
    })
    .on('pause', function(event) {
      logEvent('audio', 'pause');
    })
    .on('loadedmetadata', function(event) {
      logEvent('audio', 'loadedmetadata', undefined, undefined, false);
    })
    .on('loadeddata', function(event) {
      logEvent('audio', 'loadeddata', undefined, undefined, false);
    })
    .on('canplay', function(event) {
      logEvent('audio', 'canplay', undefined, undefined, false);
    })
    .on('canplaythrough', function(event) {
      logEvent('audio', 'canplaythrough', undefined, undefined, false);
    })
    .on('waiting', function(event) {
      logEvent('audio', 'waiting', undefined, undefined, false);
    })
    .on('playing', function(event) {
      logEvent('audio', 'playing', undefined, undefined, false);
    })
    .on('seeking', function(event) {
      logEvent('audio', 'seeking', undefined, undefined, false);
    })
    .on('seeked', function(event) {
      logEvent('audio', 'seeked', undefined, undefined, false);
    })
    .on('ended', function(event) {
      logEvent('audio', 'ended', undefined, undefined, false);
    });

  window.addEventListener('error',  function(event) {
    if (event.target && event.target.tagName === 'SOURCE') {
      logEvent('source', 'error', undefined, undefined, false, {
        platform: event.target.getAttribute('data-platform')
      });
    }
  }, true);

  $('.platform-list a')
    .on('click', function(event) {
      logEvent('link', 'click', $(this).find('div').text());
    });
});
