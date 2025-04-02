/*
 * Copyright 2018 Paul Reeve <preeve@pdjr.eu>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const Bacon = require('baconjs')
const child_process = require("child_process");

const Log = require('./lib/signalk-liblog/Log.js');
const Notification = require('./lib/signalk-libnotification/Notification.js');

const PLUGIN_ID = "process-scheduler";
const PLUGIN_NAME = "pdjr-skplugin-process-scheduler";
const PLUGIN_DESCRIPTION = "Simple process scheduling";
const PLUGIN_SCHEMA = {
  "type": "object",
  "properties": {
    "tasks": {
      "title": "Schedule tasks",
      "type": "array",
      "items": {
        "title": "Task",
        "type": "object",
        "properties": {
          "name": {
            "title": "Schedule task name",
            "type": "string"
          },  
		      "controlpath": {
            "title": "Path which starts and stops this task",
            "type": "string"
		      },
          "activities" : {
            "title": "Activities making up the schedule task",
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "path": {
                  "title": "Process control path",
                  "type": "string"
                },
                "duration": {
                  "title": "Activity duration in seconds",
                  "type": "number"
                },
                "name": {
                  "title": "Activity name",
                  "type": "string"
                },
                "delay": {
                  "title": "Delay start by this many seconds",
                  "type": "number",
                  "default": 0
                },
                "repeat": {
                  "title": "How many times to repeat (0 says forever)",
                  "type": "number",
                  "default": 1
                }
              },
              "required": [ "path", "duration" ]
            }
          }
        }
      }
    }
  },
  "required": [ "tasks" ]
};
const PLUGIN_UISCHEMA = {};

const TASK_NAME_DEFAULT = "anonymous task";
const ACTIVITY_DELAY_DEFAULT = 0;
const ACTIVITY_REPEAT_DEFAULT = 1;

module.exports = function(app) {
	var plugin = {};
	var unsubscribes = [];

	plugin.id = PLUGIN_ID;
	plugin.name = PLUGIN_NAME;
	plugin.description = PLUGIN_DESCRIPTION;
  plugin.schema = PLUGIN_SCHEMA;
  plugin.uiSchema = PLUGIN_UISCHEMA;

  const log = new Log(plugin.id, { ncallback: app.setPluginStatus, ecallback: app.setPluginError });
  const notification = new Notification(app, plugin.id);
  const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

	plugin.start = function(options) {
    
    if (Object.keys(options).length > 0) {
      if ((options.tasks) && (Array.isArray(options.tasks)) && (options.tasks.length > 0)) {

        // Filter, elaborate and validate the configuration by:
        // 1. tidying up task.name;
        // 2. making a task.controlpathobject from task.controlpath;
        // 3. elaborating each activity in the activity list.
        // Unrecoverable validation errors throw an exception and the
        // affected task is dropped.
        options.tasks = options.tasks.filter(task => {
          var matches;
          try {
            task.name = (task.name)?task.name:TASK_NAME_DEFAULT;

            if (task.controlpath) {
              task.controlpathobject = {};
              if (matches = task.controlpath.match(/^electrical\.switches\..*$/)) {
                task.controlpathobject.type = 'switch';
                task.controlpathobject.path = task.controlpath;
                task.controlpathobject.onvalue = 1;
              } else if ((matches = task.controlpath.match(/^notifications\.(.*)\:(.*)$/)) && (matches.length == 3)) {
                task.controlpathobject.type = 'notification';
                task.controlpathobject.path = 'notifications.' + matches[1];
                task.controlpathobject.onstate = matches[2];
              } else if ((matches = task.controlpathobject.match(/^notifications\.(.*)$/)) && (matches.length == 2)) {
                task.controlpathobject.type = 'notification';
                task.controlpathobject.path = 'notifications.' + matches[1];
                task.controlpathobject.onstate = undefined;
              } else {
                throw new Error ("ignoring task with invalid enabling path");
              }
            }

            if ((task.activities) && (Array.isArray(task.activities)) && (task.activities.length > 0)) {
              var activityindex = 0;
              task.activities.forEach(activity => {
                activity.name = ((activity.name)?activity.name:ACTIVITY_NAME_DEFAULT) + "[" + activityindex++ + "]";
                activity.delay = (activity.delay)?activity.delay:ACTIVITY_DELAY_DEFAULT;
                activity.repeat = (activity.repeat)?activity.repeat:ACTIVITY_REPEAT_DEFAULT;
                if (activity.path) {
                  if ((matches = activity.path.match(/^electrical\.switches\.(.*)$/)) && (matches.length == 2)) {
                    activity.type = 'switch';
                    activity.path = activity.path;
                    activity.onvalue = 1;
                    activity.offvalue = 0;
                  } else if ((matches = activity.path.match(/^notifications\.(.*)\:(.*)\:(.*)$/)) && (matches.length == 4)) {
                    activity.type = 'notification';
                    activity.path = 'notifications.' + matches[1];
                    activity.onstate = matches[2];
                    activity.offstate = matches[3];
                  } else if ((matches = activity.path.match(/^notifications\.(.*)\:(.*)$/)) && (matches.length == 3)) {
                    activity.type = 'notification';
                    activity.path = 'notifications.' + matches[1];
                    activity.onstate = matches[2];
                    activity.offstate = 'normal';
                  } else if ((matches = activity.path.match(/^notifications\.(.*)$/)) && (matches.length == 2)) {
                    activity.type = 'notification';
                    activity.path = 'notifications.' + matches[1];
                    activity.onstate = 'normal';
                    activity.offstate = undefined;
                  } else {
                    throw new Error("invalid control path (" + activity.path+ ")");
                  }
                } else {
                  throw new Error("missing control path");
                }
                if (!activity.duration) throw new Error("duration not specified");
              });
            } else {
              throw new Error("no activities specified");
            }
            return(true);
          } catch(e) {
            log.E("ignoring badly configured task '%s' (%s)", task.name, e, false);
            return(false);
          }
        });

        // We reach this point with a validated list of tasks...
        if (options.tasks.length > 0) {

          if (options.tasks.length == 1) {
            log.N("scheduling task '%s'", options.tasks[0].name);
          } else {
            log.N("scheduling multiple tasks (see log for details)");
          }
        
          // Subscribe to each tasks trigger stream, implement a child
          // process for each task and handles state changes on the
          // trigger.
          unsubscribes = options.tasks.reduce((a, { name, controlpathobject, activities }) => {

            // Get a trigger stream for the task controlpath that deals
            // with switch and notification triggers.
            var stream = app.streambundle.getSelfStream(controlpathobject.path);
            switch (controlpathobject.type) {
              case 'switch':
                ;
                break;
              case 'notification':
                if (controlpathobject.onstate === undefined) {
                  stream = stream.map(v = (v !== null)?1:0);
                } else {
                  strean = stream.map((s,v) => ((v == s)?1:0), controlpathobject.onstate);
                }
                break;
            }

            // Create a child process for executing the task's
            // activities.
            var child = child_process.fork(__dirname + "/task.js");

            // The child sends a message saying whether an activity
            // should turn its output on or off, so we manage that her
            // for both switch and notification outputs.
            child.on('message', (message) => {
              switch (message.action) {
                case 1:
                  switch (message.activity.type) {
                    case 'switch':
                      app.putSelfPath(message.activity.path, 1, (d) => app.debug("put response: %s", JSON.stringify(d)));
                      break;
                    case 'notification':
                      notification.issue(message.activity.path, "Scheduler ON event", { state: message.activity.onstate });
                    break;
                    default:
                      break;
                  }
                  break;
                case 0:
                  switch (message.activity.type) {
                    case 'switch':
                      app.putSelfPath(message.activity.path, 0, (d) => app.debug("put response: %s", JSON.stringify(d)));
                      break;
                    case 'notification':
                      if (message.activity.offstate) {
                        notification.issue(message.activity.path, "Scheduler OFF event", { state: message.activity.offstate });
                      } else {
                        notification.cancel(message.activity.path);
                      }
                      break;
                  }
                  break;
              }
            });

            child.on('exit', () => {
              log.N("stopping scheduling of: " + name);
              child = null;
            });

            // Subscribe to the trigger <stream> and wait for the
            // arrival of values saying whether to start or stop task
            // activities and respond by sending appropriate control
            // messages to the child process.
            a.push(stream.skipDuplicates().onValue(state => {
              app.debug("received trigger %d for task '%s'", state, name);
              switch (state) {
                case 1:
                  log.N("starting task '%s'", name);
                  if (child != null) child.send({ "action": "START", "activities": activities });
                  break;
                case 0:
                  log.N("stopping task '%s'", name);
                  if (child != null) child.send({ "action": "STOP" });
                  break;
              }
            }));

            return(a);
          }, []);
        } else {
          log.N("configuration includes no valid tasks");
        }
	    } else {
        log.N("configuration file is missing or unusable");
      }
    }
  }

	plugin.stop = function() {
		unsubscribes.forEach(f => f())
		unsubscribes = []
	}

	return(plugin);
}
