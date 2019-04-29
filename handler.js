"use strict";
const AWS = require("aws-sdk");
const Promise = require("bluebird");
const moment = require("moment");
const stepfunctions = new AWS.StepFunctions();
const documentClient = new AWS.DynamoDB.DocumentClient();
const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider({
  apiVersion: "2017-07-05",
  region: process.env.AWS_REGION
});

AWS.config.setPromisesDependency(Promise);

exports.postUserConfirm = (event, context, callback) => {
  if (event.request.userAttributes.email) {
    // sendEmail(
    //   event.request.userAttributes.email,
    //   "Congratulations " + event.userName + ", you have been confirmed: ",
    //   function(status) {}
    // );
  }
  const stateMachineArn = process.env.statemachine_arn;
  const params = {
    input: JSON.stringify(event),
    stateMachineArn
  };

  return stepfunctions
    .startExecution(params)
    .promise()
    .then(() => {
      callback(null, event);
    })
    .catch(error => {
      callback(error.message);
    });
};

module.exports.syncUserDepartmentToDynamodb = (event, context, callback) => {
  const params = {
    TableName: process.env.userDepartmentsTable,
    Item: {
      department: event
    },
    ConditionExpression: "attribute_not_exists(department)"
  };

  console.log("syncUserDepartmentToDynamodb::Params:", params);

  documentClient
    .put(params)
    .promise()
    .then(r => {
      return callback(null);
    })
    .catch(err => {
      return callback(err);
    });
};

module.exports.syncCognitoToDynamodb = (event, context, callback) => {
//   const {
//     request: {
//       userAttributes: { sub: id, name = "", email = "", phone_number = "" }
//     }
//   } = event;

  console.log("syncCognitoToDynamodb::event:", event);

  const parmItem = {
    department: "servee",

    region: event.region,
    userPoolId: event.userPoolId,
    username: event.userName,

    awsSdkVersion: event.callerContext.awsSdkVersion,
    clientId: event.callerContext.clientId,

    email: event.request.userAttributes.email,
    given_name: event.request.userAttributes.given_name,
    family_name: event.request.userAttributes.family_name,
    address: event.request.userAttributes.address,
    city: event.request.userAttributes.city,
    postal_code: event.request.userAttributes['custom:postal_code'],
    country: event.request.userAttributes.country,
    type: event.request.userAttributes['custom:type'],
    skills: event.request.userAttributes['custom:skills'],

    loginDate: moment().format()
  };

  // Check empty fields (DynamoDB does not allow empty values)
  if (!event.callerContext) delete parmItem.callerContext;
  if (!event.request.userAttributes) {
      delete parmItem.userAttributes;
  } else {
    if (!event.request.userAttributes.email) delete parmItem.email; 
    if (!event.request.userAttributes.given_name) delete parmItem.given_name; 
    if (!event.request.userAttributes.family_name) delete parmItem.family_name; 
    if (!event.request.userAttributes.address) delete parmItem.address; 
    if (!event.request.userAttributes.city) delete parmItem.city; 
    if (!event.request.userAttributes['custom:postal_code']) delete parmItem.postal_code; 
    if (!event.request.userAttributes.country) delete parmItem.country; 
    if (!event.request.userAttributes['custom:type']) delete parmItem.type;
    if (!event.request.userAttributes['custom:skills']) delete parmItem.skills;
}

  console.log("syncCognitoToDynamodb::parmItem:", parmItem);

  // Final item to send
  const params = {
    TableName: process.env.userTable,
    Item: parmItem
  };

  console.log("syncCognitoToDynamodb::params:", params);

  documentClient
    .put(params)
    .promise()
    .then(r => {
      return callback(null, event);
    })
    .catch(err => {
      console.log(err);
      return callback(null, err);
    });
};

function sendEmail(to, body, completedCallback) {
  console.log("SEND CUSTOM NOTIFICATION EMAIL");
}