"use strict";
/**********************************************************************
 * Copyright 2022 Paul Reeve <preeve@pdjr.eu>
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you
 * may not use this file except in compliance with the License. You may
 * obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
 * implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = void 0;
const _ = require("lodash");
const uuid_1 = require("uuid");
class Notification {
    static link(app) {
        Notification.app = app;
    }
    static canonicalise(path, value, options = {}) {
        var notification = Object.assign(Object.assign({ state: 'normal', method: [], description: '' }, value), options);
        notification.id = (notification.id) || (0, uuid_1.v4)();
        notification.path = path;
        notification.data = (Notification.app) ? { value: Notification.app.getSelfPath(path + ".value") } : {};
        notification.actions = notification.actions || [];
        return (notification);
    }
    static getNotification(key) {
        if (Notification.app) {
            const notifications = Notification.app.getSelfPath('notifications');
            return (Notification._getNotifications(notifications, (n) => ((n) && (((n.id) && (n.id == key)) || ((n.path) && (n.path == key))))));
        }
        else {
            throw new Error('Host app is not linked');
        }
    }
    static getNotifications(f = undefined) {
        if (Notification.app) {
            if ((f) && (_.isFunction(f))) {
                var matches = {};
                Notification._getNotifications(Notification.app.getSelfPath('notifications'), matches, f);
                return (matches);
            }
            else {
                throw new Error('Argument is not a function');
            }
        }
        else {
            throw new Error('Host app is not linked');
        }
    }
    static _getNotifications(notifications, matches, f = undefined) {
        if (Notification.app)
            Notification.app.debug("_getNotifications(_,%s,_)...", JSON.stringify(matches));
        var retval = {}, id, path;
        for (var key in notifications) {
            if (_.isObject(notifications[key])) {
                if ((key == 'value') && (notifications[key].state)) {
                    if ((!f) || (f(notifications[key]))) {
                        if (id = notifications[key].id)
                            matches[id] = notifications[key];
                        if (path = notifications[key].path)
                            matches[path] = notifications[key];
                    }
                }
                else {
                    Notification._getNotifications(notifications[key], matches, f);
                }
            }
        }
        return;
    }
}
exports.Notification = Notification;
