chat.pvrs.us
============

Pioneer-only chat website, using Node.js and Socket.io. 

### Setup
Run `npm install`, create a new config.json with this info:
```
{
	"oauth": {
		"client_id": "google oauth client id",
		"client_secret": "google oauth secret"
	},
	"secret": "session secret"
	"loggly": "loggly id"
}
```
