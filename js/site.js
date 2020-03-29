'use strict';

$().ready(function() {
  var episodeMatches = window.location.pathname.match(/\/episodes\/(\d+)/);
  var episode = episodeMatches ? 'episode:' + episodeMatches[1] : 'home';

  function logGoogleEvent(category, action, label, value, interaction, customDimensions) {
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

  function logFacebookEvent(name, parameters) {
    if (window.fbq) {
      window.fbq('track', name, parameters);
    }
  }

  logGoogleEvent('page', 'view');

  $('audio')
    .on('play', function(event) {
      logGoogleEvent('audio', 'play');
      logFacebookEvent('ViewContent', {
        content_ids: $('link[rel=canonical]').attr('href') || window.location.toString(),
        content_name: ($('h1.episode-title').text() || '').replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, ''),
      });
    })
    .on('pause', function(event) {
      logGoogleEvent('audio', 'pause');
    })
    .on('loadedmetadata', function(event) {
      logGoogleEvent('audio', 'loadedmetadata', undefined, undefined, false);
    })
    .on('loadeddata', function(event) {
      logGoogleEvent('audio', 'loadeddata', undefined, undefined, false);
    })
    .on('canplay', function(event) {
      logGoogleEvent('audio', 'canplay', undefined, undefined, false);
    })
    .on('canplaythrough', function(event) {
      logGoogleEvent('audio', 'canplaythrough', undefined, undefined, false);
    })
    .on('waiting', function(event) {
      logGoogleEvent('audio', 'waiting', undefined, undefined, false);
    })
    .on('playing', function(event) {
      logGoogleEvent('audio', 'playing', undefined, undefined, false);
    })
    .on('seeking', function(event) {
      logGoogleEvent('audio', 'seeking', undefined, undefined, false);
    })
    .on('seeked', function(event) {
      logGoogleEvent('audio', 'seeked', undefined, undefined, false);
    })
    .on('ended', function(event) {
      logGoogleEvent('audio', 'ended', undefined, undefined, false);
    });

  window.addEventListener('error',  function(event) {
    if (event.target && event.target.tagName === 'SOURCE') {
      logGoogleEvent('source', 'error', undefined, undefined, false, {
        platform: event.target.getAttribute('data-platform')
      });
    }
  }, true);

  $('.platform-list a')
    .on('click', function(event) {
      logGoogleEvent('link', 'click', $(this).find('div').text());
    });
});
