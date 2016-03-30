function OpenStack() {
	selfU = this;
	
	selfU.KeyStoneUrl = 'http://172.16.0.81:5000';
	selfU.NovaUrl = 'http://172.16.0.81:8774';
	selfU.HorizonUrl = 'http://172.16.0.81:9292';
	selfU.username = 'admin';
	selfU.password = 'Laboratorio';
	selfU.tenant_name = 'Projeto1';
	selfU.servicecatalog = undefined;
	
	selfU.credentials = {
		"auth": {
			"identity": {
			  "methods": ["password"],
			  "password": {
				"user": {
				  "name": this.username,
				  "domain": { "id": "default" },
				  "password": this.password
				}
			  }
			},
			"scope": {
			  "project": {
				"name": this.tenant_name,
				"domain": { "id": "default" }
			  }
			}
		}
	};
	
	selfU.BuscarInfo = function(token, projectid, ListaFlavors, ListaImages) {
		if (token === undefined) {
			
			//Fazendo Login
			selfU.send("POST", selfU.KeyStoneUrl + '/v3/auth/tokens', selfU.credentials, token, 
				function(result, headers, tokenLogin) {
					projectid = result.token.project.id;
					token = tokenLogin;

					//Pegando a lista de Flavors
					selfU.send("GET", selfU.NovaUrl + '/v2/' + projectid + '/flavors', undefined, token, 
						function(result, headers, tokenNovo) {
							ListaFlavors = result.flavors;
							console.log(ListaFlavors);
							
							//pegando a lista de iamges
							selfU.send("GET", selfU.HorizonUrl + '/v2/images', undefined, token, 
								function(result, headers, tokenNovo) {
									ListaImages = result.images;
									console.log(ListaImages);
									
							}, function(result) {
								console.log('erro na lista de images');
								console.log(result);									
							}, 2);
						}, function(result) {
							console.log('erro na lista de flavors');
							console.log(result);									
						}, 2);
				}, function(result) {
					console.log('Erro no login');
					console.log(result);
				}, 1);
		}		
	};
	
	selfU.send = function (method, url, data, token, callBackOK, callbackError, login) {
        var xhr, body, result;
		
		xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        
		if (login != 1) {
			xhr.withCredentials = true;
		}
		
        if (token !== undefined) {
			xhr.setRequestHeader('X-Auth-Token', token);
        } 
		
        xhr.setRequestHeader("Content-Type", "application/json");
		xhr.setRequestHeader("Accept", "application/json");
		
        xhr.onerror = function(error) {
            callbackError({message:"Error", body:error});
        }
        
		xhr.onreadystatechange = function () {

            if (xhr.readyState === 4) {
                switch (xhr.status) {
                // In case of successful response it calls the `callbackOK` function.
                case 100:
                case 200:
                case 201:
                case 202:
                case 203:
                case 204:
                case 205:
                case 206:
                case 207:
                    result = undefined;
                    if (xhr.responseText !== undefined && xhr.responseText !== '') {
                        if (xhr.getResponseHeader('content-type') === 'text/plain; charset=utf-8') {
                            result = xhr.responseText;
                        } else {
                            result = JSON.parse(xhr.responseText);
                        }
                    }
                    callBackOK(result, xhr.getAllResponseHeaders(), xhr.getResponseHeader('X-Subject-Token'));
                    break;

                // In case of error it sends an error message to `callbackError`.
                case 401:
                    if (skip_token) {
                        callbackError({message:xhr.status + " Error", body:xhr.responseText});
                    } else {
                        checkToken(function () {
                            callbackError({message:xhr.status + " Error", body:xhr.responseText});
                        });
                    }
                default:
                    callbackError({message:xhr.status + " Error", body:xhr.responseText});
                }
            }
        };
        
        if (data !== undefined) {
            body = JSON.stringify(data);
			try {
                xhr.send(body);
            } catch (e) {
                //callbackError(e.message);
                return;
            }
        } else {
            try {
                xhr.send();
            } catch (e) {
                //callbackError(e.message);
                return;
            }
        }
    };
	
	selfU.createserver = function (token, name, imageRef, flavorRef, key_name, user_data, security_groups, min_count, max_count, availability_zone, networks, block_device_mapping, metadata, callback, error, region) {
        var url, onOK, onError, data, groups = [], i, group, nets = [], urlPost;
        if (!check(region)) {
            return;
        }
        
        data = {
            "server" : {
                "name" : name,
                "imageRef" : imageRef,
                "flavorRef" : flavorRef
                //"nics": nics
            }
        };

        if (metadata) {
            data.server.metadata = metadata;
        }

        if (block_device_mapping !== undefined) {
            urlPost = "/os-volumes_boot";      
        } else {
            urlPost = "/servers";
        }

        if (key_name !== undefined) {
            data.server.key_name = key_name;
        }

        if (user_data !== undefined) {
            data.server.user_data = JS.Utils.encode(user_data);
        }

        if (block_device_mapping !== undefined) {
            data.server.block_device_mapping = block_device_mapping;
        }

        if (security_groups !== undefined) {
            for (i in security_groups) {
                if (security_groups[i] !== undefined) {
                    group = {
                        "name" : security_groups[i]
                    };
                    groups.push(group);
                }
            }

            data.server.security_groups = groups;
        }

        if (min_count === undefined) {
            min_count = 1;
        }

        data.server.min_count = min_count;

        if (max_count === undefined) {
            max_count = 1;
        }

        data.server.max_count = max_count;

        if (availability_zone !== undefined) {
            data.server.availability_zone = JS.Utils.encode(availability_zone);
        }

        if (networks !== undefined) {
            data.server.networks = networks;
        }

        onOK = function (result) {
            if (callback !== undefined) {
                callback(result);
            }
        };
        onError = function (message) {
            if (error !== undefined) {
                error(message);
            }
        };

        this.send("POST", params.url + urlPost, data, token, onOK, onError, 2);
    };
}

angular.module('StackApp', [])
	.controller('MainStack', ['$http', function($http) {
		// Controller-specific code goes here
		self = this;
		self.NomeServidor = '';
		self.keyname = '';
		self.flavor = '';
		self.image = '';
		self.token = undefined;
		self.projectid = '';
		self.KeyStoneUrl = 'http://172.16.0.81:5000';
		self.NovaUrl = 'http://172.16.0.81:8774';
		self.HorizonUrl = 'http://172.16.0.81:9292';
		self.username = 'admin';
		self.password = 'Laboratorio';
		self.tenant_name = 'Projeto1';
		self.servicecatalog = undefined;
	
		self.credentials = {
			"auth": {
				"identity": {
				  "methods": ["password"],
				  "password": {
					"user": {
					  "name": this.username,
					  "domain": { "id": "default" },
					  "password": this.password
					}
				  }
				},
				"scope": {
				  "project": {
					"name": this.tenant_name,
					"domain": { "id": "default" }
				  }
				}
			}
		};
	
		self.BuscarInfo = function() {
			if (self.token === undefined) {
				
				//Fazendo Login
				$http({
					url: self.KeyStoneUrl + '/v3/auth/tokens',
					method: 'POST',
					data: self.credentials,
					headers: {'Content-Type': 'application/json', 'Accept': 'application/json'}
					}).then(function successCallback(response) {
						// this callback will be called asynchronously
						// when the response is available
						self.projectid = response.data.token.project.id;
						self.token = response.headers('X-Subject-Token');
					
						$http({
							url: self.NovaUrl + '/v2/' + self.projectid + '/flavors',
							method: 'GET',
							headers: {'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Auth-Token': self.token}
							}).then(function successCallback(response) {
								self.ListaFlavors = response.data.flavors;
								
								$http({
									url: self.HorizonUrl + '/v2/images',
									method: 'GET',
									headers: {'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Auth-Token': self.token}
									}).then(function successCallback(response) {
										self.ListaImages = response.data.images;
									}, function errorCallback(response) {
										console.log('error login');
										console.log(response);
									});
								
								
							}, function errorCallback(response) {
								console.log('error login');
								console.log(response);
							});
							
						
					
					}, function errorCallback(response) {
						console.log('error login');
						console.log(response);
					});
			}	
		};
	
		self.createserver = function (token, name, imageRef, flavorRef, key_name, user_data, security_groups, min_count, max_count, availability_zone, networks, block_device_mapping, metadata, callback, error, region) {
			var url, onOK, onError, data, groups = [], i, group, nets = [], urlPost;
			if (!check(region)) {
				return;
			}
			
			data = {
				"server" : {
					"name" : name,
					"imageRef" : imageRef,
					"flavorRef" : flavorRef
					//"nics": nics
				}
			};

			if (metadata) {
				data.server.metadata = metadata;
			}

			if (block_device_mapping !== undefined) {
				urlPost = "/os-volumes_boot";      
			} else {
				urlPost = "/servers";
			}

			if (key_name !== undefined) {
				data.server.key_name = key_name;
			}

			if (user_data !== undefined) {
				data.server.user_data = JS.Utils.encode(user_data);
			}

			if (block_device_mapping !== undefined) {
				data.server.block_device_mapping = block_device_mapping;
			}

			if (security_groups !== undefined) {
				for (i in security_groups) {
					if (security_groups[i] !== undefined) {
						group = {
							"name" : security_groups[i]
						};
						groups.push(group);
					}
				}

				data.server.security_groups = groups;
			}

			if (min_count === undefined) {
				min_count = 1;
			}

			data.server.min_count = min_count;

			if (max_count === undefined) {
				max_count = 1;
			}

			data.server.max_count = max_count;

			if (availability_zone !== undefined) {
				data.server.availability_zone = JS.Utils.encode(availability_zone);
			}

			if (networks !== undefined) {
				data.server.networks = networks;
			}

			onOK = function (result) {
				if (callback !== undefined) {
					callback(result);
				}
			};
			onError = function (message) {
				if (error !== undefined) {
					error(message);
				}
			};

			self.send("POST", params.url + urlPost, data, token, onOK, onError, 2);
		};
		
		self.BuscarInfo();		
	}]);