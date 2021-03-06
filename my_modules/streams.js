module.exports = function() {
  /*
  * MongoDB Config.
  * In this tutorial, mongodb npm module is used to handle the communication between the server and database
  */
  var MongoClient = require('mongodb').MongoClient,
    assert = require('assert'),
    webRTCCollection;

  var url = 'mongodb://webrtc_user:HappyWebRTC@45.79.106.150:27025/webrtc';
  // Use connect method to connect to the Server 
  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log("Connected correctly to the server");
    socketCollection  = db.collection('socket');
  });

  /*
   * Stream classes
   */
  // root class
  var Stream = function(arg_id, arg_name, arg_user_type, arg_user_ip, arg_time_log_in) {
    this.name = arg_name;
    this.id = arg_id;
    this.user_type = arg_user_type; // will be used for filtering users
    this.user_ip = arg_user_ip; // for tracking user ip
    this.time_log_in = arg_time_log_in; // will be used for queue
  }

  // admin Stream inherit Stream
  var WebRTCStream = function(arg_id, arg_name, arg_user_type, arg_user_ip, arg_time_log_id){
    // super parent class
    Stream.call(this, arg_id, arg_name, arg_user_type, arg_user_ip, arg_time_log_id);
    this.servedWatchers = []; // optional
  }
  WebRTCStream.prototype = Object.create(Stream.prototype);
  WebRTCStream.prototype.constructor = WebRTCStream;

  // returned obj
  return {
    // add new stream
    addStream : function(arg_id, arg_name, arg_user_type, arg_user_ip, callback) {
      if(arg_user_type === 'watcher' || arg_user_type === 'broadcast'){
        var time_log_in = new Date(),
            stream = new WebRTCStream(arg_id, arg_name, arg_user_type, arg_user_ip, time_log_in);
        console.log(stream);

        // insert if not exist
        socketCollection.findAndModify(
          { id: stream.id },
          [['id', 1]],
          { $setOnInsert: stream },
          { new: true, upsert: true },
          function(err, doc){
            callback(err, doc);
        });
      }else{
        callback('invalid user type', {});
      }
    },

    // remove stream
    removeStream : function(arg_id, callback) {
      // delete doc.
      socketCollection.deleteOne({ id : arg_id }, function(err, result) {
        callback(err, result);
      });
    },

    // update socket infor
    addWatcher : function(arg_local_id, arg_remote_id, arg_user_type, callback) {
      socketCollection.updateOne({id: arg_local_id}, {$addToSet: {servedWatchers: {watcher_id: arg_remote_id} }}, function(err, result){
        callback(err, result);
      });
    },

    // remove Watcher from broadcast doc
    removeWatcher : function(arg_local_id, arg_remote_id, arg_user_type, callback){
      console.log('<--- remove watcher from broadcast doc. --->');
      socketCollection.update({id: arg_local_id}, {$pull: {servedWatchers: {watcher_id: arg_remote_id} }}, function(err, result){
        callback(err, result);
      });
    },

    getWatchers : function(arg_broadcast_id, callback){
      console.log('<--- get watchers --->');
      socketCollection.findOne({id: arg_broadcast_id}, {servedWatchers: 1}, function(err, result){
        callback(err, result);
      });
    },

    // get stream list; may be unnecessary for using cloud db
    getStreams : function(arg_user_type, callback) {
      if(arg_user_type === 'watcher' || arg_user_type === 'broadcast'){
        // get sorted docs
        socketCollection.find({user_type: arg_user_type}).sort({id: 1}).toArray(function(err, docs){
          callback(err, docs);
        });
      }else{
        callback('invalid user type', []);
      };
    }
  }
};
