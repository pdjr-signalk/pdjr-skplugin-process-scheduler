# signalk-libnotification

Issue and cancel Signal K notifications.

```
import Notification from 'signalk-libnotification'

const notification = new Notification(app, plugin.id, { "state": "alert", "method": [ "sound" ] });

var notificationPath = "mynotifications.mydummynotification";
var notificationMessage = "Just a dummy notification";

notification.issue(notificationPath, notificationMessage);
notification.cancel(notificationPath);
```

## Constructor

__Notification(*app*, *source-id* [, *options* ])__

Returns a Notification object configured for the local context.

*app* is a reference to the local app instance passed to a plugin by the
Signal K host.

*source-id* is an identifier which will be used to label the source of
generated notifications (conventionally use the ```plugin.id``` variable).

*options* is a structure which can be used to pass default values for the
'state' and 'method' fields of generated notifications.
If this is not supplied, the default values 'normal' and [] are used.
Any values supplied here can be overridden each time a call is made to
the __issue()__ method.

## Methods

__issue(*key*, *message* [, *options*])__

Writes a notification into the Signal K data store.
*key* can be an absolute value (one that begins with the string 'notifications.')
or a relative value in which case the string 'notifications.' is prepended to
*key*.

*message* the message text to be attached to the notification.

*options* is a structure which can be used to pass values for the 'state' and
'method' fields of the generated notification.
Any supplied values will override any defaults established when the Notification
object was instantiated.

__cancel(*key*)__

Cancels (deletes) any existing notification on *key* in the Signal K data store.
*key* can be an absolute value (one that begins with the string 'notifications.')
or a relative value in which case the string 'notifications.' is prepended to
*key*.
