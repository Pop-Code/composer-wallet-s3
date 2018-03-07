# composer-wallet-s3

This is Hyperledger Composer Wallet implementation using the [Amazon s3](https://aws.amazon.com/fr/s3/) as a store.

## Usage

The steps below assume that you have an application or playground, or rest server for Hyperledger Composer that wish to use.
Also it assumes you are familar with NPM, and the card concept in the Composer


### *Step 1*

- Signup for a Amazon web service account
- Create a S3 bucket 
- Go to IAM service and [create an identity credentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html#id_users_create_console) and grant access to your bucket
- Once the credential has been created, view it and save it away for later use when configuring Composer.

You will need then to keep a copy of the credentials. You will need to expose your credentials to the config, or via the environement variabe AWS_PROFILE

### *Step 2*

Firstly, this module that provides the support to connect from Composer to the Object Storage needs to be installed.
This is loaded using a node.js require statment, and the current preview will look for this in the global modules. 

```
npm install -g composer-wallet-s3
```
Or using yarn
```
yarn global add composer-wallet-s3
```

### *Step 3*

Configuration needs to be passed to the client appliation using composer to use this new wallet.

There are two main ways this can be achieved. Via configuration file, or via environment variables. 

*File*
Assuming that you do not have the config directory already - this is using the standard node npm `config` module


- Create a directory `config` in the current working directory of the application
- Create a file `default.json` in this `config` directory
- Ensure that the contents of the file are
```
{
  "composer": {
    "wallet": {
      "type": "composer-wallet-s3",
      "desc": "Uses the AWS s3 object Store",
      "options": {
        "bucketName": "my-bucket-name"
        "s3Options": {} //Optional, you can pass a full configuration to connect to the s3 api OR use the env variable AWS_PROFILE 
      }
    }
  }
}
```

- `type` is the name of this module
- `desc` is some text for the humans
- `options.bucketName` is the buckName you created
- `options.s3Options` is the config you want to use to set/override your default AWS_PROFILE

*Environment Variable*

As this is using the *config* module specifing the details on the command line via environment variables can be achieved by

```
export NODE_CONFIG='{"composer":{"wallet":{"type":"composer-wallet-s3","options":{"bucketName":"my-bucket-name"}}}}'
```

Then any application (or command line, eg `composer card list`) that is in this shell will use the cloud wallets.

### Run tests
To run tests, you must have an aws credentials profile configured on your computer and set the env variable AWS_PROFILE
```
AWS_PROFILE=myprofile npm test
```
Or using yarn
```
AWS_PROFILE=myprofile yarn test
```

### Build from source

````
#clone this repository
git clone https://github.com/Pop-Code/composer-wallet-s3.git
#go to the directory
cd composer-wallet-s3
#build
npm run build
````
Sources will build in the ./build directory.