/* ---------------------------------------------------------------------------------------
This jsaSound Code is distributed under LGPL 3
Copyright (C) 2012 National University of Singapore
Inquiries: director@anclab.org

This library is free software; you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation; either version 3 of the License, or any later version.
This library is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNULesser General Public License for more details.
You should have received a copy of the GNU General Public License and GNU Lesser General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>
------------------------------------------------------------------------------------------*/
// Kumar Subramanian (http://nishabdam.com) is the Guru responsible for the party node.js architecture!

require.config({
	shim: {
		"socketio": {
			exports: "io"
		}
	},
	paths: {
		"socketio": "/socket.io/socket.io",
		"messageSurface": (function(){
			if (! window.document.location.hostname){
				alert("This page cannot be run as a file, but must be served from a server ." );
			}
				// messageSurface server is hardcoded to port 8002 (on the same server as jsaBard - or from animatedsoundworks)
				// LOCAL var host = "http://"+window.document.location.hostname + ":8002";
				var host = "http://animatedsoundworks.com:8002";
				console.log("Will look surfaces served from " + host);
				return (host );
			})(),

		//LOCAL "jquery": "http://192.168.43.250:8000/scripts/jquery.min"
		"jquery": "http://ajax.googleapis.com/ajax/libs/jquery/2.0.2/jquery.min"
	}
});

define(
	["socketio", "messageSurface/appscripts/renderSurface", "jquery"],
	function (io, renderer) {
		function elem(id) { return document.getElementById(id); }
		function hide(id) { elem(id).setAttribute("hidden", true); }
		function show(id) { elem(id).removeAttribute("hidden"); }
		function disable(id) { elem(id).setAttribute("disabled", true); }
		function enable(id) { elem(id).removeAttribute("disabled"); }

		function mapconstrain(f1, f2, t1, t2, x) {
			var raw = t1 + ((x - f1) / (f2 - f1)) * (t2 - t1);
			return Math.max(t1, Math.min(raw, t2));
		}

		var socket;

		function init() {
			socket = io.connect(window.jsaHost);
			socket.on("connect", initConnectorView);
		}

		function loadStory(storyName) {

			function goodCb(res) {
				console.log("Got Story!");
				console.log("Response: " + JSON.stringify(res));
				initControllerView(res);
			}

			function badCb() {
				alert("ERROR! Try something else.");
			}

			$.get("/loadStory", {name: storyName})
			.done(function (res) {
				if (res)
					goodCb(res);
				else
					badCb();
			}).fail(badCb);
		}

		function initConnectorView() {
			var partyNameInput = elem("partyName");
			var partyButton = elem("partyButton");

			function joinParty() {
				var partyName = partyNameInput.value.toLowerCase().replace(/[^a-z]/g, '');
				disable("partyButton");
				partyNameInput.value = "loading...";
				disable("partyName");
				console.log("Attempting to join " + partyName);
				socket.on("confirm", function (data) {
					if (data.party === partyName) {
						console.log("Joined with story: " + data.story);
						loadStory(data.story);
					} else {
						alert("Couldn't connect!");
						partyNameInput.value = "";
						partyNameInput.focus();
					}
				});
				socket.emit("register", {
					party: partyName,
					type: "control"
				});
			}

			partyButton.addEventListener("click", joinParty);
			enable("partyName");
			enable("partyButton");
		}

		function fixController(controller) {
			var newController = {};
			newController.interface = [];
			var x, y;
			for (x in controller.interface) {
				if (controller.interface.hasOwnProperty(x)) {
					newController.interface.push({ paramioID: x });
					for (y in controller.interface[x]) {
						if (controller.interface[x].hasOwnProperty(y)) {
							newController.interface[newController.interface.length - 1][y] = controller.interface[x][y];
						}
					}
				}
			}

			return newController;
		}

		function initControllerView(storyObj) {
			hide("connectorContainer");
			show("app");
			var newController = fixController(storyObj.controller);  // gets the "surface" from the data stored with the server on the authored story
			renderer.renderSurface(newController);
			renderer.configure("/", 0);
		}

		init();
	}
);
