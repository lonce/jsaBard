//jsaSound and jquery are defined in main.js
define(
	[ "require", "jsaSound/jsaCore/sliderBox", "jsaSound/jsaCore/config", "jquery", "Story"],
	function (require, makeSliderBox, jsaSoundConfig, $, Story) {
		var story = {};

		var showSliderBoxesP = false; // automatically set to true if running control->synth over the net

		var soundServer = jsaSoundConfig.resourcesPath;

		var sliderBoxes = {};
		var soundModelNames = [];
		var soundModelFactories = {};

		var rawSoundModels = {};

		var isPlaying = {};
		var currState = {};

		var numScenes;

		rigPlayer={};  // API for this rigPlayer


		function tokenizeByVBar(s) {
			return s.trim().split("|");
		}

		function getSMFactoryFromName(name) {
			return tokenizeByVBar(name)[0];
		}

		function fixController(model) {
			var controllerModel = {};
			controllerModel.interface = {};
			for (i = 0; i < model.interface.length; i++) {
				var x;
				var name = model.interface[i].paramioID;
				controllerModel.interface[name] = {};
				for (x in model.interface[i]) {
					if (model.interface[i].hasOwnProperty(x) && x != "paramioID") {
						controllerModel.interface[name][x] = model.interface[i][x];
					}
				}
			}
			return controllerModel;
		}

		function initStory (storyObj, storyName) {
			story = Story(fixController(storyObj.controller)); // this is the "surface data" that is currently stored with the Story
			story.setStoryScenes(storyObj.scenes);
			if (storyObj.scenes.length <= 0) {
				console.log("This story has no scenes!");
				return;
			}
			numScenes = storyObj.scenes.length;
			setScene(0);
		}

		function setScene (sceneId) {
			console.log("Setting scene in handler to scene " + sceneId);
			story.setCurrentScene(sceneId);
			reloadSounds();
		}

		function clearSliderBoxes() {
			// Memory leak?
			sliderBoxes = {};
			rawSoundModels = {};
		}

		function closeSliderBoxes() {
			var x;
			for (x in sliderBoxes) {
				if (sliderBoxes.hasOwnProperty(x)) {
					sliderBoxes[x].close();
				}
			}

			for (x in rawSoundModels) {
				if (rawSoundModels.hasOwnProperty(x)) {
					rawSoundModels[x].release();
					rawSoundModels[x].destroy();
				}
			}
		}

		function reloadSounds() {
			closeSliderBoxes();
			clearSliderBoxes();
			reloadSoundModels(loadSounds);
		}

		function reloadSoundModels(callback) {
			// Memory leak?
			soundModelNames = [];
			soundModelFactories = {};
			if (!story.getCurrentScene())
				return;
			soundModelNames = story.getCurrentScene().getSoundModels();

			loadSoundModels(callback);
		}

		//Callbacks are optional
		function loadSoundModels(callback) {
			// TODO: Sanitize list (?)
			function soundModelHelper(num) {
				if (num < soundModelNames.length) {
					console.log("The scene you are loading has " + soundModelNames.length + " models.");
					require(
						// Get the model
						[soundServer + "/jsaModels/" + soundModelNames[num]],
						// And open the sliderBox
						function (currentSM) {
							console.log("Making slider box");
							console.log("Adding " + soundModelNames[num] + " to soundModelFactories object");

							soundModelFactories[soundModelNames[num]] = currentSM;
							console.log("just created soundModelFactories[" + soundModelNames[num] + "]");
							soundModelHelper(num + 1);
						}
					);
				} else if (callback)
					callback();

			}
			soundModelHelper(0);
		}

		function loadSounds() {
			initIsPlaying();
			loadSliderBoxes();
			initNStates();
			// There may be a need to initialise other types of handlers as well
			// Currently, other types will start with their default values from jsaSound
			// Later on, we could have them start with default values from the story. eg.
		}

		// Defaults all sounds to NOT PLAYING
		function initIsPlaying() {
			isPlaying = {};
			var soundList = story.getCurrentScene().getSoundNames();

			var i;
			for (i = 0; i < soundList.length; i++) {
				isPlaying[soundList[i]] = false;
			}
		}

		function loadSliderBoxes() {
			if (!story.getCurrentScene())
				return;
			var soundList = story.getCurrentScene().getSoundNames();
			var i;
			for (i = 0; i < soundList.length; i++) {
				var smFactoractory = getSMFactoryFromName(soundList[i]);

				rawSoundModels[soundList[i]] = soundModelFactories[smFactoractory]();
				if (showSliderBoxesP===true){
					sliderBoxes[soundList[i]] = makeSliderBox(rawSoundModels[soundList[i]]);
				} 
			}
		}

		function setState(state) {
			var i, j;
			var soundList = story.getCurrentScene().getSoundNames();

			var model;
			var soundState;


			for (i = 0; i < soundList.length && i < state.length; i++) {

				if (showSliderBoxesP===true){
					model = sliderBoxes[soundList[i]];
				} else{
					model = rawSoundModels[soundList[i]];
				}
				soundState = state[i];

				//console.log("will set state for sliderBoxes[" + soundList[i] + "]");
				console.log("will set state for soundModelss[" + tokenizeByVBar(soundList[i])[0] + "]");


				if (!model) {
					console.log("ERROR: There's no slider box or sound model for " + soundList[i]);
					continue;
				}
				for (j = 0; j < soundState.length; j++) {
					if (soundState[j].type === "range")
						model.setParam(soundState[j].name, soundState[j].value);
					else
						model.setParam(soundState[j].name, soundState[j].value);
				}
			}
		}

		function interpolateVals(low, high, weight) {
			return low + (weight * (high - low));
		}

		function interpolateStates(low, high, weight) {
			var newState = [];
			var i, j, k;
			for (i = 0; i < low.length && i < high.length; i++) {
				var lowSoundState = low[i];
				var highSoundState = high[i];
				newState.push([]);
				for (j = 0; j < lowSoundState.length; j++) {
					if (lowSoundState[j].type !== "range")
						continue;
					var lowName = lowSoundState[j].name;
					for (k = 0; k < highSoundState.length; k++) {
					// Inefficient, but safe
						var highName = highSoundState[k].name;
						if (lowName === highName) {
							newState[i].push({
								name: highName,
								type: highSoundState[k].type,
								value: interpolateVals(lowSoundState[j].value, highSoundState[k].value, weight)
							});
							break;
						}
					}
				}
			}
			return newState;
		}

		function initNStates() {
			var handlerName;
			var handlers = story.getCurrentScene().getSceneObj().handlers;
			var firstStateTargets;
			var i;
			for (handlerName in handlers) {
				if (handlers.hasOwnProperty(handlerName) && handlers[handlerName].type === "nState") {
					currState[handlerName] = 0;
					setState(handlers[handlerName].states[0]);
				}
			}
		}


		function rangeMessageHandler(handler, value) {
			setState(interpolateStates(handler.min, handler.max, value));
		}

		function nStateMessageHandler(handler, value) {
			setState(handler.states[value]);
		}

		function sceneChangeMessageHandler(handler, value) {
			//console.log("sceneChangeMessageHandler with value = " + value)
			//var sceneNum = Math.min(story.getCurrentSceneId() + 1, story.getNextSceneId() - 1); //Don't go beyond the last scene!
			//setScene(sceneNum);
			setScene(value);
		}

		function defaultHandler(handlerName) {
			console.log("ERROR: Message handler for " + handlerName + " does not exist!");
		}

		var messageHandlers = {
			"range": rangeMessageHandler,
			"nState": nStateMessageHandler,
			"sceneChange": sceneChangeMessageHandler
		};
		//==========================================================================================
		// rigPlayer API
		//==========================================================================================

		rigPlayer.dispatch = function(msg) {
			var i, targetModelName, targetParamName, targetVal;
			var handlerName = msg.id;
			var handler = story.getCurrentScene().getSceneObj().handlers[handlerName];

			if (!handler) {
				console.log("ERROR: Handler " + handlerName + " does not exist!");
				return;
			}

			if (messageHandlers[handler.type])
				messageHandlers[handler.type](handler, msg.val);
			else
				defaultHandler(handlerName);
		}


		rigPlayer.loadStory = function(i_storyName, i_cb) {
			// TODO: (MAYBE) Ensure another story isn't already loaded
			var storyName = i_storyName;

			function goodCb(res, cb) {
				alert("Story loaded!");
				console.log("Response: " + JSON.stringify(res));
				initStory(res, storyName);
				if (cb) cb(res, storyName);
			}

			function badCb() {
				alert("Could not load story!");
			}

			$.get("/loadStory", {name: storyName})
			.done(function (res) {
				if (res)
					goodCb(res, i_cb);
				else
					badCb();
			}).fail(badCb);
		}


		rigPlayer.showSliderBoxes = function (bool){
			showSliderBoxesP=bool;
		}


		return rigPlayer;

	}
);
