# pdjr-skplugin-process-scheduler

## Description

**pdjr-skplugin-process-scheduler** implements a simple process
scheduler which manages an arbitrary number of user defined *task*s.

A *task* is composed of a sequence of one or more activities.

Each *activity* consists of an initial *delay* followed by a start
event, an elapsed *duration* and finally a stop event.
The activity can be *repeat*ed an arbitrary number of times or
indefinitely.

The start event is associated with either a PUT update to (1) on a
Signal K switch path or the issuing of a notification on some Signal K
notification path.

The stop event is associated with either a PUT update to (0) on a
Signal K switch path or the issuing or cancelling of a notification on
some Signal K notification path.

The resulting sequence of event activity can be leveraged to control
external, real world, processes.

Each *task* is triggered by the appearance of either a boolean true
value on a Signal K switch path or of a notification, perhaps with a
particular state, on a notification path.

More complex trigger conditions can be implemented using an external
plugin to raise and remove any necessary trigger.

## Example application

Imagine a ship with an electrical lubrication pump that delivers grease
directly to the propeller shaft bearing.
We want to ensure that the bearing is well greased at the beginning of every
voyage and lightly greased periodically during the voyage.

This requirement can be met by a "lubrication" task consisting of two
activities: a 'start' activity which runs once when the main engine is
fired up and a subsequent 'iterate' activity which runs repeatedly for
as long as the engine is running.
The start event in both activities is used to issue a notification which
signals that the lubrication pump should run.

Controlling execution of the lubrication task can be accomplished in
many ways, the simplest is probably to sense the state of the engine
ignition switch.
Modern engines with CAN interfaces into Signal K may support other ways
of detecting engine state.

The simplest control strategy for the lubrication pump involves
directing PUT updates to a relay switch channel.

The plugin configuration for handling just this shaft librication task
might look like this.

```
"configuration": {
  "tasks": [
    {
      "name": "shaft lubrication",
      "controlpath": "electrical.switches.bank.0.11.state",
      "activities": [
        {
          "name": "start",
          "path": "electrical.switches.bank.26.5.state",
          "delay": 0,
          "duration": 120,
          "iterate": 1
        },
        {
          "name": "iterate",
          "path": "electrical.switches.bank.26.5.state",
          "delay": 1800,
          "duration": 30,
          "iterate": 0
        }
      ]
    }
  ]
}
```

## Configuration

The plugin has the following configuration properties.

| Property name | Value type | Value default | Description |
| :------------ | :--------- | :------------ | :---------- |
| tasks         | Array      | (none)        | Collection of *task* objects. |

Each *task* object has the following properties.

| Property name | Value type | Value default | Description |
| :------------ | :--------- | :------------ | :---------- |
| name          | String     | ''            | Name of the task (used in messaging and logging). |
| controlpath   | String     | (none)        | Signal K key whose value triggers the task. |
| activities    | Array      | (none)        | Collection of *activity* objects. |

There are two ways of specifying a *controlpath* key.

1. Use a switch path. Simply supply a path in the 'electrical.switches.'
   tree which when on (1) will enable the task.

2. Use a notification path. Supplying a notification path allows a task
   to be controlled either by the presence/absense of a notification.
   Supplying a path of the form  '*notification_path*[**:**_state_]'
   allows control by the presence/absense of a particular notification
   state.

Each object in the *activities* array has the following properties.

| Property name | Value type | Value default | Description |
| :------------ | :--------- | :------------ | :---------- |
| path          | String     | (none)        | Signal K key to be updated when start and stop events occur. |
| duration      | Number     | (none)        | Number seconds between activity start and stop events. |
| name          | String     | ''            | Name of the activity (used in messaging and logging). |
| delay         | Number     | 0             | Number of seconds before start event. |
| repeat        | Number     | 1             | Number of times to repeat the activity (0 says forever). |

*path* can specify either a switch key or a notification key.
A switch key will be set to 1 by the on event and to 0 by the off
event.
A simple notification key will result in a notification with state
'normal' being issued by the on event and the notification being
cancelled by the off event.
A key of the form '*notification_path*__:__*state*' causes similar
behaviour, but the notification issued by the on event will have the
specified *state*.
A key of the form '*notification_path*__:__*onstate*__:__*offstate*'
will result in a persistent notification whose state is set to the
specified values by the on and off events.

# Author

Paul Reeve <*preeve_at_pdjr_dot_eu*>