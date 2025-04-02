var timeout = null;
var myActivities = null;
var currentActivity = null;

/**
 * Start or stop execution of the sequence of activities that make up
 * a task. The message contains an <action> (either 'START' or 'STOP')
 * and an array of <activities>. 
 */
process.on('message', (message) => {
  switch (message.action) {
    case "START":
      myActivities = message.activities;
      currentActivity = -1;
      launchActivity();
      break;
    case "STOP":
      if (timeout != null) { clearTimeout(timeout); timeout = null; }
      if ((myActivities != null) && (currentActivity != -1)) process.send({ "action": 0, "activity": myActivities[currentActivity] });
      currentActivity = -1;
      break;
  }
        // If the just terminated activity wasn't the "END" activity then
        // execute any activity called "END".
        //if (name != "END") {
            // If there is an activity called "END", then execute it.
            //var endactivities = message.activities.filter(a => (a.name == "END"));
            //if (endactivities.length == 1) executeActivity(endactivities[0]);
        //}
});

/**
 * Execute the next activity in the activities list by bumping the
 * currentActivity index and calling executeActivity. This function is
 * passed as a callback so that executeActivity can daisy chain the
 * next activity as it exits. 
 */
function launchActivity() {
  currentActivity++;
  if (currentActivity < myActivities.length) {
    executeActivity(launchActivity);
  } else {
    currentActivity = -1;
  }
}

/**
 * Executes <activity> by sleeping for the defined delay period before calling
 * the parent process with a start action request.  Then sleep for the defined
 * duration before calling the parent process with a stop action request.
 * Iterate this as many times a is requested.
 *
 * activity: the activity { name, path, delay, duration, iterate }
 */ 
async function executeActivity(callback) {
  for (var i = 0; ((currentActivity != null) && ((myActivities[currentActivity].repeat == 0) || (i < myActivities[currentActivity].repeat))); i++) {
    if (currentActivity != null) {
      if (myActivities[currentActivity].delay > 0) await sleep(myActivities[currentActivity].delay * 1000);
      if (currentActivity != null) {
        process.send({ "action": 1, "activity": myActivities[currentActivity] });
        if (myActivities[currentActivity].duration > 0) await sleep(myActivities[currentActivity].duration * 1000);
        process.send({ "action": 0, "activity": myActivities[currentActivity] });
      }
    }
  }
  callback();
}

async function sleep(millis) {
  return new Promise(resolve => (timeout = setTimeout(resolve, millis)));
}
