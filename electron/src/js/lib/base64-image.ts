/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

 // Movie to axios

import * as request from 'request';

import * as arrayify from './arrayify';
import {fromBuffer} from './datauri';

function fetch(url, callback) {
  request({ url: url, encoding: null }, (error, response, body) => {
    if (error) return callback(error);
    let mimetype = response.headers['content-type'];
    callback(null, fromBuffer(mimetype, body));
  });
}

export default function(urls: Array<string>|string, limit: number = 1, callback: Function) {
  let imagesToFetch: Array<string> = arrayify(urls).slice(0, limit);
  let completedRequests: number = 0;
  let images: Array<string> = [];

  if (imagesToFetch.length === 0) {
    return callback();
  }

  imagesToFetch.forEach((url) => {
    fetch(url, (err, dataURI) => {
      completedRequests++;

      if (dataURI) {
        images.push(dataURI);
      } else if (err) {
        console.log('Unable to fetch image');
      }

      if (completedRequests === imagesToFetch.length) {
        callback(images.length > 1 ? images : images[0]);
      }
    });
  });
};
