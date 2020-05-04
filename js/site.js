'use strict';

$().ready(function () {
  var episodeMatches = window.location.pathname.match(/\/episodes\/(\d+)/);
  var episode = episodeMatches ? 'episode:' + episodeMatches[1] : 'home';
  var canonicalURL =
    $('link[rel=canonical]').attr('href') || window.location.toString();

  function logGoogleEvent(
    category,
    action,
    label,
    value,
    interaction,
    customDimensions,
  ) {
    if (interaction === undefined) {
      interaction = true;
    }
    var dimensions = {
      non_interaction: !interaction,
      event_category: category,
      event_label: label,
      value: value,
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
    .on('play', function (event) {
      logGoogleEvent('audio', 'play', event.target.currentSrc);
      logFacebookEvent('ViewContent', {
        content_ids: canonicalURL,
        content_name: ($('h1.episode-title').text() || '').replace(
          /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,
          '',
        ),
      });
    })
    .on('pause', function (event) {
      logGoogleEvent('audio', 'pause');
    })
    .on('loadedmetadata', function (event) {
      logGoogleEvent(
        'audio',
        'loadedmetadata',
        event.target.currentSrc,
        undefined,
        false,
      );
    })
    .on('loadeddata', function (event) {
      logGoogleEvent(
        'audio',
        'loadeddata',
        event.target.currentSrc,
        undefined,
        false,
      );
    })
    .on('canplay', function (event) {
      logGoogleEvent(
        'audio',
        'canplay',
        event.target.currentSrc,
        undefined,
        false,
      );
    })
    .on('canplaythrough', function (event) {
      logGoogleEvent(
        'audio',
        'canplaythrough',
        event.target.currentSrc,
        undefined,
        false,
      );
    })
    .on('waiting', function (event) {
      logGoogleEvent(
        'audio',
        'waiting',
        event.target.currentSrc,
        undefined,
        false,
      );
    })
    .on('playing', function (event) {
      logGoogleEvent(
        'audio',
        'playing',
        event.target.currentSrc,
        undefined,
        false,
      );
    })
    .on('seeking', function (event) {
      logGoogleEvent(
        'audio',
        'seeking',
        event.target.currentSrc,
        undefined,
        false,
      );
    })
    .on('seeked', function (event) {
      logGoogleEvent(
        'audio',
        'seeked',
        event.target.currentSrc,
        undefined,
        false,
      );
    })
    .on('ended', function (event) {
      logGoogleEvent(
        'audio',
        'ended',
        event.target.currentSrc,
        undefined,
        false,
      );
    });

  if ('share' in navigator) {
    $('.share-button')
      .on('click', function () {
        if (navigator.share) {
          logGoogleEvent('share', 'click', canonicalURL);
          navigator.share({
            url: canonicalURL,
          });
        }
      })
      .removeClass('d-none');
  }

  moment.locale('zh-cn');
  $('[data-date]').each(function (index, element) {
    $(element).text(
      moment($(element).attr('data-date')).calendar({
        sameDay: '[今天]A h 点 mm 分',
        nextDay: '[明天]A h 点 mm 分',
        nextWeek: '[下]ddddA h 点 mm 分',
        lastDay: '[昨天]A h 点 mm 分',
        lastWeek: '[上]ddddA h 点 mm 分',
        sameElse: 'YYYY 年 M 月 D 日A h 点 mm 分',
      }),
    );
  });

  window.addEventListener(
    'error',
    function (event) {
      if (event.target && event.target.tagName === 'SOURCE') {
        logGoogleEvent('source', 'error', event.target.src, undefined, false, {
          platform: event.target.getAttribute('data-platform'),
        });
      }
    },
    true,
  );

  $('.platform-list a').on('click', function (event) {
    logGoogleEvent('link', 'click', $(this).find('div').text());
  });
});
