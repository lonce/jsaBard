/* ---------------------------------------------------------------------------------------
This jsaSound Code is distributed under LGPL 3
Copyright (C) 2012 National University of Singapore
Inquiries: director@anclab.org

This library is free software; you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation; either version 3 of the License, or any later version.
This library is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNULesser General Public License for more details.
You should have received a copy of the GNU General Public License and GNU Lesser General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>
------------------------------------------------------------------------------------------*/
// Kumar Subramanian (http://nishabdam.com) is the Guru responsible for the party node.js architecture!
// Modified, adapted, and further messed with by:
//	Lonce Wyse, July 2010
// Re-done by Pallav Shinghal (http://pshinghal.com)

require.config({
	shim: {
		"socketio": {
			exports: "io"
		}
	},
	paths: {
		"jsaSound": (function(){
			if (! window.document.location.hostname){
				alert("This page cannot be run as a file, but must be served from a server (e.g. animatedsoundworks.com:8001, or localhost:8001)." );
			}
				// jsaSound server is hardcoded to port 8001 (on the same server as jsaBard - or from animatedsoundworks)
				//LOCAL  var host = "http://"+window.document.location.hostname + ":8001";
				var host = "http://animatedsoundworks.com:8001";
				console.log("Will look for sounds served from " + host);
				return (host );
			})(),
		"jquery": "http://ajax.googleapis.com/ajax/libs/jquery/2.0.2/jquery.min",
		//LOCAL "jquery": "http://localhost:8000/scripts/jquery.min",
		"socketio": "/socket.io/socket.io"
	}
});

define(
	[ "require", "jsaSound/jsaCore/sliderBox", "jsaSound/jsaCore/config", "jquery", "Story", "socketio", "soundPlayerAPI"],
	function (require, makeSliderBox, jsaSoundConfig, $, Story, io, rigPlayer) {

		function elem(id) {
			return document.getElementById(id);
		}

		function initMessaging(storyName) {
			var partyDiv = elem("partySelector");
			partyDiv.removeAttribute("hidden");
			var partyNameElem = elem("partyName");

			var makeParty = (function () {
				var letters  = "abcdefghijklmnopqrstuvwxyz";
				var category = "vcccvcccvcccccvcccccvccccc";
				var consonants = "bcdfghjklmnpqrstvwxyz";
				var vowels = "aeiou";

				return function (n) {
					var result = [];
					var i, k, a1, a2, a3;
					for (i = 0; i < n; ++i) {
						k = Math.floor(Math.random() * letters.length);
						a1 = letters.charAt(k);
						a2 = vowels.charAt(Math.floor(Math.random() * vowels.length));
						a3 = consonants.charAt(Math.floor(Math.random() * consonants.length));

						if (category.charAt(k) === 'c') {
							// First letter is a consonant. Make the second
							// a vowel and the third a consonant.
							result.push(a1 + a2 + a3);
						} else {
							// First letter is a vowel. Make the second a consonant
							// and the third a vowel.
							result.push(a1 + a3 + a2);
						}
					}
					return result.join(' ');
				};
			}());

			function getMessageId(obj) {
				return obj.d[0];
			}

			// Works ONLY with one-piece values
			function getMessageVal(obj) {
				return obj.d[1];
			}

			var partyName = makeParty(3);

			var socket = io.connect(window.jsaHost);
			socket.on("connect", function () {
				console.log("Synth connected to server with party name: " + partyName);
				var registerMessage = {
					party: partyName.replace(/ /g, ''),
					type: "synth",
					story: storyName
				};
				socket.emit("register", registerMessage);
				socket.on("confirm", function (data) {
					if (data.party === registerMessage.party) {
						partyNameElem.innerHTML = partyName;
						socket.on("message", function (msgStr) {
							var msgObj = JSON.parse(msgStr);
							//console.log("Got MESSAGE! Value of msgObj is:");
							//console.log(msgObj);
							rigPlayer.dispatch({
								id: getMessageId(msgObj),
								val: getMessageVal(msgObj)
							});
						});
					} else {
						partyNameElem.innerHTML = "Failed!";
					}
				});
			});
		}

		function netcomms_setup(storyName){
			initMessaging(storyName);
			showSliderBoxesP=true;

			elem("loadStory").setAttribute("disabled", true);
			elem("storyName").setAttribute("disabled", true);

			//alert("in cb");
		}

		function loadStoryButton(){
			rigPlayer.loadStory(elem("storyName").value, netcomms_setup);
		}


		elem("loadStory").addEventListener("click", loadStoryButton);
	}
);
