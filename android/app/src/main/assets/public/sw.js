/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-7e5eb42b'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "widget-template.json",
    "revision": "ee8233f03babff93ee4647ec74a551a7"
  }, {
    "url": "widget-data.json",
    "revision": "68076f188d279c4333fec191ff655d7b"
  }, {
    "url": "shortcut-research.png",
    "revision": "987849703d77135c3e0135c020497e2b"
  }, {
    "url": "shortcut-quiz.png",
    "revision": "9f3ab3398468032ed4e060c442b14d21"
  }, {
    "url": "shortcut-puzzles.png",
    "revision": "5c203fe73fb1c2e092d5487cce066362"
  }, {
    "url": "shortcut-focus.png",
    "revision": "e3bf7558b49017cc5903cb3cab1d1f42"
  }, {
    "url": "screenshot-mobile.png",
    "revision": "fa26688f576c7f6bd45c78ee69debd66"
  }, {
    "url": "screenshot-desktop.png",
    "revision": "30547348bf6e98370d36da9e6344ddd9"
  }, {
    "url": "pwa-512x512.png",
    "revision": "9936b9216e73e3b8bc114be75b0df711"
  }, {
    "url": "pwa-192x192.png",
    "revision": "f1abd5abab6b8c70ba2c37b696fdf0bd"
  }, {
    "url": "maskable-icon-512x512.png",
    "revision": "3b7a04d5533c1897bdefeda571931446"
  }, {
    "url": "manifest.json",
    "revision": "c35277e887d8c91985b9b8598e6c1001"
  }, {
    "url": "logo.jpg",
    "revision": "e6d16129757711bfa9de425d013bfa90"
  }, {
    "url": "index.html",
    "revision": "c9cf66bf263b8cf75927d464198346b3"
  }, {
    "url": "icon.svg",
    "revision": "c3f7839a3793712e177ba69d1b94ec83"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "8b97a30214aa44fcc1b339450f495523"
  }, {
    "url": "app_logo.png",
    "revision": "3bf8b2576d4ce4da763e9845a163b296"
  }, {
    "url": "app_logo.jpg",
    "revision": "e6d16129757711bfa9de425d013bfa90"
  }, {
    "url": "assets/index-DAdNURVa.css",
    "revision": null
  }, {
    "url": "assets/index-BiQJCcPn.js",
    "revision": null
  }, {
    "url": "app_logo.jpg",
    "revision": "e6d16129757711bfa9de425d013bfa90"
  }, {
    "url": "app_logo.png",
    "revision": "3bf8b2576d4ce4da763e9845a163b296"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "8b97a30214aa44fcc1b339450f495523"
  }, {
    "url": "icon.svg",
    "revision": "c3f7839a3793712e177ba69d1b94ec83"
  }, {
    "url": "logo.jpg",
    "revision": "e6d16129757711bfa9de425d013bfa90"
  }, {
    "url": "maskable-icon-512x512.png",
    "revision": "3b7a04d5533c1897bdefeda571931446"
  }, {
    "url": "pwa-192x192.png",
    "revision": "f1abd5abab6b8c70ba2c37b696fdf0bd"
  }, {
    "url": "pwa-512x512.png",
    "revision": "9936b9216e73e3b8bc114be75b0df711"
  }, {
    "url": "screenshot-desktop.png",
    "revision": "30547348bf6e98370d36da9e6344ddd9"
  }, {
    "url": "screenshot-mobile.png",
    "revision": "fa26688f576c7f6bd45c78ee69debd66"
  }, {
    "url": "shortcut-focus.png",
    "revision": "e3bf7558b49017cc5903cb3cab1d1f42"
  }, {
    "url": "shortcut-puzzles.png",
    "revision": "5c203fe73fb1c2e092d5487cce066362"
  }, {
    "url": "shortcut-quiz.png",
    "revision": "9f3ab3398468032ed4e060c442b14d21"
  }, {
    "url": "shortcut-research.png",
    "revision": "987849703d77135c3e0135c020497e2b"
  }, {
    "url": "widget-data.json",
    "revision": "68076f188d279c4333fec191ff655d7b"
  }, {
    "url": "widget-template.json",
    "revision": "ee8233f03babff93ee4647ec74a551a7"
  }, {
    "url": "manifest.json",
    "revision": "c35277e887d8c91985b9b8598e6c1001"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
