(function() {  
        var app=angular.module('SalesforceAngularBlocks',['ngAnimate','angularUtils.directives.dirPagination','ngSanitize','ui.bootstrap'])//,'cometd-reload'
        app.constant('SESSION_ID', '{!$Api.Session_ID}')
        app.constant('USER_PROFILE_ID', '{!$Profile.Id}')
        app.constant('USER_PROFILE_NAME', '{!$Profile.Name}')
        app.constant('PRM_PREFIX', '{!$Site.Prefix}')
        app.constant('Object_ID', '{!$CurrentPage.parameters.id}')
        app.factory('jsonListOfObjectDefination',function($salesforceApiForVf,$rootScope){
            
            var jsonListOfObjectDefination={!jsonListOfObjectDefination}
            
            return jsonListOfObjectDefination
        })
        
        app.factory('Sboject',function($q,$salesforceApiForVf,$rootScope,jsonListOfObjectDefination,AllMessages,checkJobStatus){
            var fetchQueryInit=function(deferred){
                
                var thisrefrence=this
                thisrefrence.data=[]
                $salesforceApiForVf.composite(
                    $salesforceApiForVf.org,
                    {
                       query:{soql:this.query,referenceId:'dataquery'},
                       fetchUrl:{pathplusquery:"/services/data/v40.0/sobjects/"+thisrefrence.Key+"/describe/layouts/@{dataquery.records[0].RecordTypeId}", referenceId:"layoutdata"}
                    }
                ).then(
                        function(response){
                            thisrefrence.data=response.data.compositeResponse[0].body.records
                            thisrefrence.layout=response.data.compositeResponse[1].body
                            thisrefrence.layout.relatedListsMap={}
                            if(thisrefrence.layout.relatedLists)
                            thisrefrence.layout.relatedLists.forEach(function(value,key){
                                thisrefrence.layout.relatedListsMap[value.sobject]=value
                            })
                            if(deferred)
                                deferred.resolve(thisrefrence.layout)
                        },function(response){
                        
                        }
                 )
                 return deferred.promise;
            }
            var fetchQuery=function(){
                var thisrefrence=this
                thisrefrence.data=[]
            	$salesforceApiForVf.query($salesforceApiForVf.org,this.query).then(
                        function(response){
                            thisrefrence.data=response.data.records            
                        },null,
                        function(response){
                            thisrefrence.data=response.data.records
                        }
                    )
            }
            
            var Sboject={}
            Sboject.init=function(jsonObject){
                fromJson(this,jsonObject)
            	this.RelatedListMap.forEach(function(v){
                    v.fetchQuery=fetchQuery;
                    v.reload=fetchQuery
                    v.fetchQuery()
                })
                this.reload=fetchQuery
            	this.fetchQueryInit=fetchQueryInit
            	this.fetchQueryInit($q.defer()).then(function(layout){
                	console.log('layout fetched')
                })
            }
            var fromJson = function(thisobject, jsonobject) {  
              for (var prop in jsonobject) {
                if (jsonobject.hasOwnProperty(prop)) {
                  thisobject[prop] = jsonobject[prop];      
                }
              }
            };
            return Sboject
                                        
        })
        app.factory('AllMessages',function(){
            return {
            	pagelevel:{},
            	blocklevel:{},
                fieldlevel:{},
				delete:function(level,blockIdentifier,messageIdentifier){
					if(this[level][blockIdentifier]&&this[level][blockIdentifier][messageIdentifier])
						delete this[level][blockIdentifier][messageIdentifier]
					if(this[level][blockIdentifier]&&level=='pagelevel')
						delete this[level][blockIdentifier]
				},
				add:function(message,level,blockIdentifier,messageIdentifier){
					if(!this[level][blockIdentifier]&&messageIdentifier){
						this[level][blockIdentifier]={}
						this[level][blockIdentifier][messageIdentifier]=message
							
					}
					if(this[level]&&level=='pagelevel'){
						this[level][blockIdentifier]=message
					}	
				}
            }
        })
        app.factory('checkJobStatus',function($salesforceApiForVf,$q){
            return function(id,interval){
                   var deferred=$q.defer()
                   if(!interval)
                       interval=3000
                   var jobstatus=$salesforceApiForVf.query($salesforceApiForVf.org,"SELECT Id, CreatedDate, JobType, ApexClassId, Status, JobItemsProcessed, TotalJobItems FROM AsyncApexJob where id='"+id+"'")
                   
                   var jobstatusfunction=function(data){
                            if(data.data.records&&data.data.records[0].Status=="Completed"){
                                deferred.resolve(data.data.records[0])
                            }
                       		if(data.data.records&&data.data.records[0].Status=="Failed" && data.data.records[0].JobItemsProcessed==data.data.records[0].TotalJobItems){
                                deferred.resolve(data.data.records[0])
                            }
                       	    if(data.data.records&& data.data.records[0].JobItemsProcessed<data.data.records[0].TotalJobItems){
                                deferred.notify(data.data.records[0])
                            }
                       		if(data.data.records&&data.data.records[0].Status!="Completed"){
                                $salesforceApiForVf.query($salesforceApiForVf.org,"SELECT Id, CreatedDate, JobType, ApexClassId, Status, JobItemsProcessed, TotalJobItems FROM AsyncApexJob where id='"+id+"'").then(function(data){
                                    jobstatusfunction(data)
                               },function(data){
                                    jobstatusfunction(data)
                               })
							}
                    }        
                   jobstatus.then(function(data){
                        jobstatusfunction(data)
                   },function(data){
                        jobstatusfunction(data)
                   })
                   return deferred.promise;
                        
            }
        })
        app.factory('extractRowMetadata',function(jsonListOfObjectDefination){
            return function(key,fieldpath){
                        if(fieldpath.indexOf('__r')>-1){
                            fieldpath=fieldpath.substring(0,fieldpath.indexOf('__r'))+'__c'
                        }
                		try{
                        	return jsonListOfObjectDefination[key].fieldDescribeMap[fieldpath]
                        }catch(e){
                        	return null
                        }
                    }
        })
        app.controller('SalesforceAngularBlocksController', function($scope, $rootScope, $document,$filter,$http,$salesforceApiForVf,$uibModal,SESSION_ID,Object_ID,PRM_PREFIX,extractRowMetadata,remoteSave,remoteInsert,remoteDelete,jsonListOfObjectDefination,Sboject,AllMessages,$salesforceStreaming,customexceptionMessages){
            $scope.AllMessages=AllMessages
            $salesforceStreaming.initialize()
            
            $scope.message='Loading'
            $rootScope.message='rootLoading'

            $scope.Sboject=Sboject
            $scope.Sboject.init({!jsonObject})
            console.log($scope.Sboject)
            $scope.jsonListOfObjectDefination=jsonListOfObjectDefination
            console.log($scope.jsonListOfObjectDefination)
            console.log($scope.Sboject.RelatedListMap)
              
            $scope.pageChangeHandler = function(num) {
                console.log('meals page changed to ' + num);
            };           
        });
        app.factory('customexceptionMessages',function(){
            return function(message){
                if(message.indexOf('Billing_Terms_lookup__c')>0){
                    return "Billing terms doesn't have contract only checked "
                }
                if(message.indexOf('Payment_Term_lookup__c')>0){
                    return "Payment terms doesn't have contract only checked "
                }
                if(message.indexOf('Shipping_Terms_lookup__c')>0){
                    return "Shipping  terms doesn't have contract only checked "
                }
                return message;
            }
        })
        app.controller('CreateNewController',function($scope,$uibModalInstance,extractRowMetadata,relatedlist,Sboject,jsonListOfObjectDefination,remoteInsert,customexceptionMessages){
            console.log(relatedlist)
            var relatedProperties=[]
            $scope.newRelatedList= JSON.parse(JSON.stringify(relatedlist))
            console.log($scope.newSobject)
            $scope.newRelatedList.data=[];
            $scope.newRelatedList.prototype={}
                      
            $scope.newRelatedList.NewViewDefination.forEach(function(v) {
                var property=v.apiName;
                if(v.apiName.indexOf('__r.')>-1){
                    property=v.apiName.substring(0,v.apiName.indexOf('__r.'))+'__r'
                    relatedProperties.push(property)
                }
                v.apiName=property;
                $scope.newRelatedList.prototype[property]=undefined;
                
                
            })
            jsonListOfObjectDefination[Sboject.Key].ChildRelationship.forEach(function(v){
                if($scope.newRelatedList.Key==v.childSObject)
                    $scope.newRelatedList.prototype[v.field.replace('__c','__r')]={Id:Sboject.data[0].Id,Name: Sboject.data[0].Name}                   
            })  
            $scope.newRelatedList.prototype['sobjectType']=$scope.newRelatedList.Key
            $scope.newRelatedList.data.push(angular.copy($scope.newRelatedList.prototype))
            $scope.addMoreNew=function(){
                $scope.newRelatedList.data.push(angular.copy($scope.newRelatedList.prototype))
            }
            $scope.removeNew=function(index){
                $scope.newRelatedList.data.slice(index,1)
            }
            $scope.extractRowMetadata=extractRowMetadata
            
            $scope.save = function () {
                
                $scope.newRelatedList.data.forEach(function(v1){
                    relatedProperties.forEach(function(v){
                        if(v1[v])
                        v1[v.substring(0,v.indexOf('__r'))+'__c']=v1[v].Id
                        delete v1[v]
                    })
                })
                $scope.servering=true
                var originaltoJSON=Date.prototype.toJSON 
                Date.prototype.toJSON = function(){ return this.getTime() }
                var data=angular.fromJson(angular.toJson($scope.newRelatedList.data))
                Date.prototype.toJSON=originaltoJSON
                $scope.saveMessages={} 
                remoteInsert(data).then(function(result){
                        
                        delete relatedlist.creatingNew
                        if(result.data.length==0){
                            //delete relatedlist.creatingNew
                            $scope.saveMessages['save']={
                             show:true,
                             removable:true,
                             styleClass:'error-message',
                             content:customexceptionMessages(result.message)
                            }
                        }else{
                            relatedlist.fetchQuery()
                            Sboject.reload();
                            
                            $uibModalInstance.close(result);
                        }
                        $scope.servering=false
                    },function(error){
                        console.log(error);
                        $scope.servering=false
                        delete relatedlist.creatingNew
                        alert("something went wrong try again")
                    })
                //
            };
            
            $scope.cancel = function () {
                $uibModalInstance.dismiss('cancel');
            };
        })
        
        app.factory('createNew',function($uibModal,$document){
        	return function(relatedlist,parent) {
                            
                var modalInstance = $uibModal.open({
                    animation: true,
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: 'newSobjectModal.html',
                    controller: 'CreateNewController',
                    controllerAs: this,
                    size:'lg',
                    appendTo:angular.element($document[0].getElementById("controller")),
                    resolve: {
                        relatedlist: function () {
                            return relatedlist;
                        }
                    }
                });
                
                modalInstance.result.then(function (data) {
                    
                }, function () {
                    
                });
                    
           }
        })
        app.factory('dataOperation',function(remoteSave,remoteDelete,reloadFactory,customexceptionMessages,AllMessages){
            return {
                		save:function(value,Id,scope,reloadlist){
                                    scope.operation="Saving..."
                                    //var originaltoJSON=Date.prototype.toJSON 
                                    //Date.prototype.toJSON = function(){ return this.getTime() }
                                    //value.updatedValues=angular.fromJson(angular.toJson(value.updatedValues))
                                    //Date.prototype.toJSON=originaltoJSON
                                    value.updatedValues=angular.fromJson(JSON.stringify( value.updatedValues, function( key, value ) {
                                        if( key === "$$hashKey" ) {
                                            return undefined;
                                        }
                                        if (this[key] instanceof Date) {
                                           return this[key].getTime();
                                        }
                                        return value;
                                    }))
                                    if(value.updatedValues&&!Id){
                                        remoteSave(value.updatedValues,"type").then(function(result){
                                            console.log(result);
                                            if(result=="success"){
                                                delete value.updatedValues
                                                delete value.progress['all']
												AllMessages.delete("blocklevel",value.Key,'New')
												reloadFactory(reloadlist)
                                            }else{
												AllMessages.add({
                                                 show:true,
                                                 removable:true,
                                                 styleClass:'error-message',
                                                 content:customexceptionMessages(result)
                                                },'blocklevel',value.Key,'New')
											
											}
                                            
                                            scope.operation=false
                                        })
                                        if(!value.progress)
                                            value.progress={}
                                        value.progress['all']=true
                                                    
                                    }
                                    else if(value.updatedValues&&Id){
                                        var data={}
                                        data[Id]=value.updatedValues[Id]
                                        remoteSave(data,"type").then(function(result){
                                            console.log(result);
                                            if(result=="success"){
                                                delete value.updatedValues[Id]
                                                AllMessages.delete("blocklevel",value.Key,Id)
                                                reloadFactory(reloadlist)
                                            }else{
                                                AllMessages.add({
                                                 show:true,
                                                 removable:true,
                                                 styleClass:'error-message',
                                                 content:customexceptionMessages(result)
                                                },'blocklevel',value.Key,Id)
                                                
                                            }
                                            delete value.progress[Id]
                                            
                                            scope.operation=false
                                        })
                                        if(!value.progress)
                                            value.progress={}
                                        value.progress[Id]=true
                                    }
                        },
                		delete:function(value,Id,scope,reloadlist){
                                    scope.operation="Deleting..."
                                    if(!value.progress)
                                            value.progress={}
                                    value.progress[Id]=true
                    
                                    remoteDelete([{Id:Id}]).then(function(result){
                                            console.log(result);
                                            if(result=="success"){
                                                scope.operation=""
                                                reloadFactory(reloadlist)
                                                delete value.progress[Id]
                                                AllMessages.delete("blocklevel",value.Key,Id)
                                            }else{
                                               AllMessages.add({
                                                 show:true,
                                                 removable:true,
                                                 styleClass:'error-message',
                                                 content:customexceptionMessages(result)
                                                },'blocklevel',value.Key,Id)
                                                scope.operation=""
                                                delete value.progress[Id]
                                            }
                                    })
                                }
                   }
        })    
        app.factory("reloadFactory",function(){
        	return function(reloadlist){
            	if(reloadlist&&reloadlist  instanceof  Array){
                    reloadlist.forEach(function(objecttoreload){
                        objecttoreload.reload()
                    })
                }
                if(reloadlist&&reloadlist  instanceof  Object &&!(reloadlist  instanceof  Array)){
                    reloadlist.reload()
                }
            }
        })
        app.factory('remoteSave', ['$q', '$rootScope', function($q, $rootScope) {
            return function(data,type) {
                var deferred = $q.defer();
                Visualforce.remoting.Manager.invokeAction(
                    '{!$RemoteAction.StandardAngularController.save}',
                    data,
                    function(result, event) {
                        $rootScope.$apply(function() {
                            if (event.status) {
                                deferred.resolve(result);
                            } else {
                                deferred.reject(event);
                            }
                        })
                    },
                    { buffer: true, escape: true, timeout:  120000 }
                );
                return deferred.promise;
            }
        }])
        app.factory('remoteInsert', ['$q', '$rootScope', function($q, $rootScope) {
            return function(data) {
                var deferred = $q.defer();
                Visualforce.remoting.Manager.invokeAction(
                    '{!$RemoteAction.StandardAngularController.insertData}',
                    data,
                    function(result, event) {
                        $rootScope.$apply(function() {
                            if (event.status) {
                                deferred.resolve(JSON.parse(result));
                            } else {
                                deferred.reject(event);
                            }
                        })
                    },
                    { buffer: true, escape: false, timeout:  120000 }
                );
                return deferred.promise;
            }
        }])
        app.factory('remoteDelete', ['$q', '$rootScope', function($q, $rootScope) {
            return function(data) {
                var deferred = $q.defer();
                Visualforce.remoting.Manager.invokeAction(
                    '{!$RemoteAction.StandardAngularController.deleteData}',
                    data,
                    function(result, event) {
                        $rootScope.$apply(function() {
                            if (event.status) {
                                deferred.resolve(result);
                            } else {
                                deferred.reject(event);
                            }
                        })
                    },
                    { buffer: true, escape: true, timeout:  120000 }
                );
                return deferred.promise;
            }
        }])
        app.filter('Extractdata',function(){
            return function getPropByString(obj, propString) {
                if (!propString)
                    return obj;
            
                var prop, props = propString.split('.');
            
                for (var i = 0, iLen = props.length - 1; i < iLen; i++) {
                    prop = props[i];
            
                    var candidate = obj[prop];
                    if (candidate !== undefined) {
                        obj = candidate;
                    } else {
                        break;
                    }
                }
                return obj[props[i]];
            }

        
        })
        app.filter('toArray', function () {
          return function (obj, addKey) {
            if (!angular.isObject(obj)) return obj;
            if ( addKey === false ) {
              return Object.keys(obj).map(function(key) {
                return obj[key];
              });
            } else {
              return Object.keys(obj).map(function (key) {
                var value = obj[key];
                return angular.isObject(value) ?
                  Object.defineProperty(value, '$key', { enumerable: false, value: key}) :
                  { $key: key, $value: value };
              });
            }
          };
        })
        app.directive('ngClickNodigest', function ($parse) {
            return {
                compile : function ($element, attr) {
                    var fn = $parse(attr['ngClickNodigest']);
                    return function (scope, element, attr) {
                        element.on('click', function (event) {
                            fn(scope, {
                                $event : event,
                                $element : element
                            });
                        });
                    };
                }
            };
        })
        app.directive("message", function($compile){
            return {
                scope: {
                    messageShow: '=',
                    messageStyleClass:'=',
                    messageContent: '=',
                    messageObject: '=',
                    messagesObject: '=',
                    messageObjectKey:'='
                },
                template: '<div ng-show="messageShow" class="{{messageStyleClass}}" style="position: relative;">'
                          +'<loader ng-show="messageObject.showloader" ></loader>'
                          +'<div>{{messageContent}}</div>'
                          +'<div ng-show="messageObject.removable" class="glyphicon glyphicon-remove" ng-click="deleteMessage()" style="position: absolute;top: 0;left: 0;background: white;color: black;padding: 5px;border-radius: 50%;margin: -5px;border: 1px solid blue;"></div>'
                          +'</div>',
                link: function(scope, element, attrs){
                    scope.deleteMessage=function(){ 
                       delete scope.messagesObject[scope.messageObjectKey]
                    }
                }
            };
        });
        app.directive('dynamicModel', ['$compile', '$parse', function ($compile, $parse) {
            return {
                restrict: 'A',
                terminal: true,
                priority: 100000,
                link: function (scope, elem) {
                    var name = $parse(elem.attr('dynamic-model'))(scope);
                    elem.removeAttr('dynamic-model');
                    elem.attr('ng-model', name);
                    $compile(elem)(scope);
                }
            };
        }]);
        app.directive('dynamicName', ['$compile', '$parse', function ($compile, $parse) {
            return {
                restrict: 'A',
                terminal: true,
                priority: 100000,
                link: function (scope, elem) {
                    var name = $parse(elem.attr('dynamic-name'))(scope);
                    elem.removeAttr('dynamic-name');
                    elem.attr('name', name);
                    $compile(elem)(scope);
                }
            };
        }]);
        app.directive("column", function($compile){
            return {
                require: "?ngModel",
                scope: {
                    value: '=ngModel',
                    editable:'=isEditable',
                    readOnly: '='
                },
                transclude: true,
                compile: function(element, attrs) {
                    //element.append('<div ng-include="\'' + attrs.type + '-template.html\'"></div>')
                },
                //template: "<span ng-show='readOnly'>{{value}}</span><input ng-hide='readOnly' ng-model='value' ng-change='onChange()'>",
                link: function(scope, element, attrs, ngModel){
                    if (!ngModel) return;
                    
                    scope.onChange = function(){
                        ngModel.$setViewValue(scope.value);
                    };
                    
                    ngModel.$render = function(){
                        scope.value = ngModel.$modelValue;
                    };
                }
            };
        });
        
        app.directive("block", function($compile,$templateCache){
            return {
                scope: {
                    value: '=',
                    visible:'=',
                    data: '=value',
                    parentdata:'=',
                    blockType:'=',
                    ctrl:"=?"
                    
                },
                transclude: true,
                replace:true,
                controller:['$controller', '$scope','ControllerChecker', function($controller, $scope,ControllerChecker) {
                  if(ControllerChecker.exists($scope.blockType+'_BlockController')){
                  	  $scope.ctrl=$scope.blockType+'_BlockController'
                  }else{
                      $scope.ctrl='Default_BlockController'
                  }
                  var ctrl= $controller($scope.ctrl, {$scope: $scope});
                  return ctrl;
                }],
                link:{
                    pre: function( scope, element, attrs ) {
                    },
                	post :function(scope, element, attrs,ctrl){
                          scope.getContentUrl = function() {
                              var templateName=scope.blockType.toLowerCase()+'_Block.html'
                              if(document.querySelector('script[type="text/ng-template"][id="'+templateName+'"]'))
                                  return templateName
                              return "Default_Block.html"
                   		  }
                          //var template = '<div ng-include ng-class="" src="getContentUrl()"></div>';
                          //var linkFn = $compile(template);
                          var linkFn = $compile($templateCache.get(scope.getContentUrl()));
                          var content = linkFn(scope);
                          element.append(content);
                          scope.block={
                          }
                }
            }
            };    
        });
        app.controller("Default_BlockController",function($scope,$parse,$uibModal,$document,$rootScope,extractRowMetadata,Sboject,FinalizeProductRemote,UnFinalizeProductRemote,AllMessages,customexceptionMessages){
                  
        })
        app.controller("RelatedList_BlockController",function($scope,$parse,$uibModal,$document,$rootScope,extractRowMetadata,Sboject,FinalizeProductRemote,UnFinalizeProductRemote,AllMessages,customexceptionMessages){
                  $scope.extractRowMetadata=extractRowMetadata
                  $scope.value.pageSize=10;$scope.value.currentPage=1
        })
        app.controller("Object_BlockController",function($scope,$parse,$uibModal,$document,$rootScope,extractRowMetadata,Sboject,FinalizeProductRemote,UnFinalizeProductRemote,AllMessages,customexceptionMessages){
                  $scope.extractRowMetadata=extractRowMetadata
        })
		app.controller("Message_BlockController",function($scope,$parse,$uibModal,$document,$rootScope,extractRowMetadata,Sboject,FinalizeProductRemote,UnFinalizeProductRemote,AllMessages,customexceptionMessages){
                  
        })
         
        app.directive("actionbutton", function($compile){
            return {
                scope: {
                    label: '=label',
                    name:'=',
                    buttonType:'=',
                    disable:'=',
                    visible:'=',
                    data: '=',
                    parentdata:'=',
                    ctrl:"=?"
                    
                },
                transclude: true,
                replace:true,
                controller:['$controller', '$scope','ControllerChecker', function($controller, $scope,ControllerChecker) {
                  if(ControllerChecker.exists($scope.name+'_ButtonController')){
                  	  $scope.ctrl=$scope.name+'_ButtonController'
                  }else{
                      $scope.ctrl='Default_ButtonController'
                  }
                  var ctrl= $controller($scope.ctrl, {$scope: $scope});
                  return ctrl;
                }],
                //template: "<span ng-show='readOnly'>{{value}}</span><input ng-hide='readOnly' ng-model='value' ng-change='onChange()'>",
                link:{
                    pre: function( scope, element, attrs ) {
                    },
                	post :function(scope, element, attrs,ctrl){
                          scope.getContentUrl = function() {
                            if (scope.disable) {
                                var templateName=scope.buttonType.toLowerCase()+'.disabled.html'
                                if(document.querySelector('script[type="text/ng-template"][id="'+templateName+'"]'))
                                    return templateName
                                 return "button.readonly.html"
                            }
                            else {
                                var templateName=scope.buttonType.toLowerCase()+'.html'
                                if(document.querySelector('script[type="text/ng-template"][id="'+templateName+'"]'))
                                    return templateName
                                return "button.html"
                            }
                   		  }
                    	  var template = '<div ng-include ng-class="" src="getContentUrl()"></div>';
                   		  var linkFn = $compile(template);
                          var content = linkFn(scope);
                          element.append(content);
                          scope.button={
                              label:scope.label,
                              action:scope.action,
                              disable:scope.disable,
                              visible:scope.visible
                          }
                }
            }
            };    
        });
        app.controller("Default_ButtonController",function($scope,$parse,$uibModal,$document,$rootScope,Sboject,FinalizeProductRemote,UnFinalizeProductRemote,AllMessages,customexceptionMessages){
                  $scope.action=function(){
                  	console.log('button clicked')
                    
                  }
        })
        app.controller("New_ButtonController",function($scope,$parse,$uibModal,$document,$rootScope,Sboject,createNew,FinalizeProductRemote,UnFinalizeProductRemote,AllMessages,customexceptionMessages){
                  $scope.action=function(){
                    console.time('createNew')
                  	console.log('new button clicked')
                    createNew($scope.data)
                    console.timeEnd('createNew')
                  }
        })
        app.controller("Save_ButtonController",function($scope,$parse,$uibModal,$document,$rootScope,Sboject,dataOperation,AllMessages,customexceptionMessages){
                  $scope.action=function(){
                  	console.log('save button clicked',$scope)
                    dataOperation.save($scope.data,$scope.data.data[0].Id,$scope,[Sboject])
                  }
        })
        
        app.directive("field", function($controller,$compile,$parse,$uibModal,$document,$rootScope,$templateCache,Sboject,ControllerChecker,extractRowMetadata){
            return{
                scope:{
                  parentref:"=",
                  a:"=ngData",
                  readOnly:"<",
                  fieldType:"<",
                  isColumn:"<",
                  rowData:"<",
                  rowMetadata:"<",
                  metadataKey:"<",
                  metadataApiName:"<",  
                  rowParent:"<",
                  currentobject:"<",
                  styleClass:"=",
                  ctrl:"=?"
                },
                
      			transclude: true,
                replace:true,
                controller:['$controller', '$scope','ControllerChecker', function($controller, $scope,ControllerChecker) {
                  if(!$scope.ctrl)
                      $scope.ctrl='FieldDefaultController'
                  else if(!ControllerChecker.exists($scope.ctrl)){
                  	  $scope.ctrl='FieldDefaultController'
                  }
                  var ctrl= $controller($scope.ctrl, {$scope: $scope});
                  return ctrl;
                }],
                //name: 'ctrl',
                //controller: '@',
                //controllerAS: 'feild',
                link:{
                    pre: function( scope, element, attrs ) {
                        //console.log( attrs.ngData,scope.a );
                          attrs.ngData=scope.a
                          //console.log( attrs.ngData,scope.a );
                    },
                	post :function(scope, element, attrs,ctrl){
                          scope.getContentUrl = function() {
                          if (scope.readOnly) {
                                var templateName=scope.fieldType.toLowerCase()+'.readonly.html'
                                if(document.querySelector('script[type="text/ng-template"][id="'+templateName+'"]'))
                                    return templateName
                                    return "string.readonly.html"
                           }
                           else {
                            	var templateName=scope.fieldType.toLowerCase()+'.html'
                            	if(document.querySelector('script[type="text/ng-template"][id="'+templateName+'"]'))
                                	return templateName
                                return "string.readonly.html"
                            }
                          }
                    	  var template = '<div ng-include ng-class="isColumn?\'templatedivColumn\':\'templatedivfield\'" src="getContentUrl()"></div>';
                          //var linkFn = $compile(template);
                          var linkFn = $compile($templateCache.get(scope.getContentUrl()));
                          var content = linkFn(scope);
                          element.append(content);
                          scope.field={
                              key:scope.a,
                              value:scope.b,
                              actual:scope.b
                          }
                   		  scope.rowMetadata=extractRowMetadata(scope.metadataKey,scope.metadataApiName)
                          function update(){ 
                               
                              if(scope.fieldType=="LOOKUP"){
                                scope.field.value = $parse(scope.a.substring(0,scope.a.indexOf('r.')+1))(scope.$parent) 
                                if(scope.a.slice( -3 )=="__r")
                                    scope.field.value = $parse(scope.a)(scope.$parent)
                              }else if(scope.fieldType=="DATE"){
                                scope.field.value = new Date($parse(scope.a)(scope.$parent))    
                              }else{
                                scope.field.value = $parse(scope.a)(scope.$parent)
                              }
                              scope.field.actual=scope.field.value;
                          }
                  
                  		  if(scope.currentobject){
                               if(!scope.currentobject.updatedValues) {
                                    scope.currentobject.updatedValues={}
                               }  
                          }
                          update()
						  $rootScope.$on("update",update);
                  		  scope.$watch(
                              function(){return $parse(scope.a)(scope.$parent);},
                              function(newvalue,oldvalue){
								update()
                                    
                              }, true
                          )
                          $rootScope.$on("update",update);
                  		  scope.$watch(
                              function(){return scope.field;},
                              function(newvalue,oldvalue){
								if(newvalue.value!=oldvalue.value){
                                	console.log(newvalue,oldvalue)
                                    scope.update(newvalue.value)
                                }
                                    
                              }, true
                          )	
                  		  scope.update= function(b) {
                      		  
                              if(scope.a.indexOf('__r.')>-1){
                                $parse(scope.a.substring(0,scope.a.indexOf('r.'))).assign(scope.$parent.$parent,scope.field.value)
                                if(scope.a.slice( -3 )=="__r")
                                    scope.b = $parse(scope.a).assign(scope.$parent.$parent,scope.field.value) 
                              }else{
                                $parse(scope.a).assign(scope.$parent.$parent, scope.field.value)
                              }
                      
                              if(scope.currentobject){
                                     
                                  if(!scope.currentobject.updatedValues[scope.rowData.Id]){
                                      var data={}
                                      data['Id']=scope.rowData.Id
                                      
                                      if(scope.fieldType=="LOOKUP"){
                                          data[(scope.a.substring(0,scope.a.indexOf('__r.'))+'__c').replace(scope.parentref,'')]=scope.field.value?scope.field.value.Id:null
                                      }
                                      if(scope.fieldType=="operationselect"){
                                          
                                      }
                                      if(!(scope.fieldType=="operationselect"||scope.fieldType=="LOOKUP")){
                                          data[scope.a.replace(scope.parentref,'')]=eval('scope.rowData.'+scope.a.replace(scope.parentref,''))
                                      }
                                      scope.currentobject.updatedValues[scope.rowData.Id]=data
                                      
                                  }else{
                                      if(scope.fieldType=="LOOKUP"){
                                          scope.currentobject.updatedValues[scope.rowData.Id][(scope.a.substring(0,scope.a.indexOf('__r.'))+'__c').replace(scope.parentref,'')]=scope.field.value?scope.field.value.Id:null
                                      }
                                      if(scope.fieldType=="operationselect"){
                                          
                                      }
                                      if(!(scope.fieldType=="operationselect"||scope.fieldType=="LOOKUP")){ 
                                          scope.currentobject.updatedValues[scope.rowData.Id][scope.a.replace(scope.parentref,'')]=eval('scope.rowData.'+scope.a.replace(scope.parentref,''))
                                      }  
                                  }
                              }
                          if(scope.currentobject&&scope.field.actual==scope.field.value){
                              
                              if(Object.keys(scope.currentobject.updatedValues[scope.rowData.Id]).length<=2)
                                  delete scope.currentobject.updatedValues[scope.rowData.Id]
                              else
                                  delete scope.currentobject.updatedValues[scope.rowData.Id][scope.a.replace('rsobject.','')]
                          }
                  };
                   
                }
        		}
            }
        })
        app.controller("FieldDefaultController",function($scope,$parse,$uibModal,$document,$rootScope,Sboject,AllMessages,customexceptionMessages){
                   var scope=$scope
                   
        })
        app.controller("DATE",function($scope,$parse,$uibModal,$document,$rootScope,Sboject,AllMessages,customexceptionMessages){
                   var scope=$scope
                   scope.toggleDatepopup=function(){
                    scope.datepopup=true
                   }
        })
        app.controller("PERCENT",function($scope,$parse,$uibModal,$document,$rootScope,Sboject,AllMessages,customexceptionMessages){
                   var scope=$scope
                  
        })
        app.controller("PICKLIST",function($scope,$parse,$uibModal,$document,$rootScope,Sboject,AllMessages,customexceptionMessages){
                   var scope=$scope
                   scope.selectionChanged=function(b){
                        scope.field.value=b
                        //scope.update();
                   }
        })
        app.controller("DATE",function($scope,$parse,$uibModal,$document,$rootScope,Sboject,AllMessages,customexceptionMessages){
                   var scope=$scope
                   scope.toggleDatepopup=function(){
                    	scope.datepopup=true
                   }
                  
                  
        })
        
        app.controller("LOOKUP",function($scope,$parse,$uibModal,$document,$rootScope,$salesforceApiForVf,Sboject,extractRowMetadata,AllMessages,customexceptionMessages){
                   var scope=$scope
                   scope.$watch(function(){return scope.rowMetadata},function(){
                       if(!scope.rowParent.lookupViewDefination||(scope.rowParent.lookupViewDefination&&scope.rowMetadata&&!scope.rowParent.lookupViewDefination[scope.rowMetadata['referenceTo'][0]])){
                           $salesforceApiForVf.getSearchLayout($salesforceApiForVf.org,scope.rowMetadata['referenceTo'][0]).then(
                                function(response){
                                    if(!scope.rowParent.lookupViewDefination)
                                        scope.rowParent.lookupViewDefination={}
                                    var SObjectSearchMap={};
                                    SObjectSearchMap.Key=scope.rowMetadata['referenceTo'][0];
                                    SObjectSearchMap.name=scope.rowMetadata['referenceTo'][0].split('_').join(' ');
                                    SObjectSearchMap.Fields=[];
                                    SObjectSearchMap.Filter=[];
                                    SObjectSearchMap.displayColums=[];
                                    SObjectSearchMap.NewViewDefination=[];
                                    SObjectSearchMap.lookupViewDefination={};
                                    SObjectSearchMap.data=[]; 
                                    response.data[0].searchColumns.forEach(function(value){
                                        SObjectSearchMap.Fields.push(value.name)
                                        if(value.name.indexOf("toLabel(")==0)
                                            value.name=value.name.split("toLabel(")[1].split(')')[0]
                                        SObjectSearchMap.displayColums.push({
                                                LabelName:value.label,
                                                apiName:value.name,
                                                editable:false, 
                                                typeoffield:'STRING',
                                                controller:'STRING'
                                        })
                                    })
                                    var  wherepart='';
                                    if(SObjectSearchMap.Filter.length>0){
                                        wherepart=' where '+SObjectSearchMap.Filter.join(',');
                                    }
                                    SObjectSearchMap.recentQuery='SELECT '+SObjectSearchMap.Fields.join(',')+' RecentlyViewed WHERE Type IN (\''+SObjectSearchMap.key+'\') ORDER BY LastViewedDate DESC ';
                                    SObjectSearchMap.query='FIELDS RETURNING '+SObjectSearchMap.Key+' (Id,'+SObjectSearchMap.Fields.join(',')+')';
                                    scope.rowParent.lookupViewDefination[scope.rowMetadata['referenceTo'][0]]=SObjectSearchMap
                                }
                           )
                       }
                       scope.lookupRemove=function(){
                            scope.field.value=null;
                           //scope.update();
                       }
                   })
                   scope.lookup=function(searchValue,size) {
                            console.log(scope.rowMetadata);console.log(scope.rowData);console.log(scope.rowParent);
                            var modalInstance = $uibModal.open({
                              animation: true,
                              ariaLabelledBy: 'modal-title',
                              ariaDescribedBy: 'modal-body',
                              templateUrl: 'lookupModal.html',
                              controller: 'ModalInstanceCtrl',
                              controllerAs: 'this',
                              size: size,
                              appendTo:angular.element($document[0].getElementById("controller")),
                              resolve: {
                                row: function () {
                                  if(!scope.rowMetadata)
                                      scope.rowMetadata=extractRowMetadata(scope.metadataKey,scope.metadataApiName)
                                  return {
                                    Definition:scope.rowParent.lookupViewDefination[scope.rowMetadata['referenceTo'][0]],
                                    data:scope.rowData,
                                    searchValue:searchValue
                                  };
                                }
                              }
                            });
                        
                            modalInstance.result.then(function (selectedItem) {
                                    scope.field.value=selectedItem
                                
                                    //scope.update(scope.b)
                                
                            }, function () {
                             
                            });
                    
                   }
                                      
        })
        app.controller("BOOLEAN",function($scope,$parse,$uibModal,$document,$rootScope,Sboject,FinalizeProductRemote,UnFinalizeProductRemote,AllMessages,customexceptionMessages){
                   var scope=$scope
                   scope.toggleBoolean=function(){
                       //scope.b=scope.b?false:true
                       //scope.update();
                   }
                                   
        })
        app.controller("OPERATIONSELECT",function($scope,$parse,$uibModal,$document,$rootScope,Sboject,FinalizeProductRemote,UnFinalizeProductRemote,AllMessages,customexceptionMessages){
                   $scope.field.actual=false
                                   
        })
        app.controller("OPERATIONEDIT",function($scope,$parse,$uibModal,$document,$rootScope,dataOperation,Sboject,FinalizeProductRemote,UnFinalizeProductRemote,AllMessages,customexceptionMessages){
                   $scope.save=function(reladedlist,id){
                       console.log(reladedlist,id)
                       dataOperation.save(reladedlist,id,$scope,[reladedlist,Sboject])
                   }
                   $scope.delete=function(reladedlist,id){
                       console.log(reladedlist,id)
                       dataOperation.delete(reladedlist,id,$scope,[reladedlist,Sboject])
                   }
                                   
        })
        
        app.service('ControllerChecker', ['$controller', function($controller) {
            return {
                exists: function(controllerName) {
                    if(typeof window[controllerName] == 'function') {
                        return true;
                    }
                    try {
                        
                        $controller(controllerName);
                        return true;
                    } catch (error) {
                        return !(error instanceof TypeError);
                    }
                }
            };
        }])
        app.run(function ($templateCache,$salesforceApiForVf,SESSION_ID,PRM_PREFIX){
          if (!Array.prototype.forEach) {
              Array.prototype.forEach = function(fn, scope) {
                  for(var i = 0, len = this.length; i < len; ++i) {
                      fn.call(scope, this[i], i, this);
                  }
              }
          }
          NodeList.prototype.forEach = Array.prototype.forEach;
          document.querySelectorAll('template[type="text/ng-template"]').forEach(function(v){
               $templateCache.put(v.getAttribute('Id'),v.innerHTML)
          })
          document.querySelectorAll('script[type="text/ng-template"]').forEach(function(v){
               $templateCache.put(v.getAttribute('Id'),v.innerHTML)
          })
          $salesforceApiForVf.org={}
          $salesforceApiForVf.org['access_token']=SESSION_ID
          $salesforceApiForVf.org['instance_url']='https://'+window.location.hostname+PRM_PREFIX||'';
        })  
        app.controller('ModalInstanceCtrl', function ($scope,$uibModalInstance,$salesforceApiForVf,row,extractRowMetadata) {
              var $ctrl = this;
              $scope.extractRowMetadata=extractRowMetadata
            //$scope.filterValue=row.searchValue.Name
              $scope.relatedSobject=row.Definition
              $scope.relatedSobject.data=[]
              $scope.filterName=$scope.relatedSobject.displayColums[0].apiName
              $scope.search=function(query){
                    $scope.message="Loading.."
                    $scope.servering=true
                    $salesforceApiForVf.search($salesforceApiForVf.org,query).then(
                          function(data){
                              $scope.relatedSobject.data=data.data.searchRecords
                              $scope.servering=false
                          },function(error){
                                $scope.message="No results found"
                                $scope.servering=false
                          }
                     )
              }
              
              //$scope.search($scope.relatedSobject.recentQuery)
              //$scope.search('Find {' +$scope.filterValue+'} In '+$scope.filterName+' '+$scope.relatedSobject.query +'  LIMIT 100')
                
              $scope.modifyQuery=function(){
                console.log($scope.filterName,$scope.filterValue)
                $scope.search('Find {' +$scope.filterValue+'} In '+$scope.filterName+' '+$scope.relatedSobject.query +'  LIMIT 100')
              }
              if($scope.filterValue=='' || $scope.filterValue==undefined ||( $scope.filterValue && $scope.filterValue.length < 3) ){
                    $scope.message="Please enter search term having more than three characters"
              }else{
                  $scope.modifyQuery()
              }
              $scope.select=function(item,event){
                  
                $uibModalInstance.close({Id:item.Id,Name:item.Name});
              }
              
              $ctrl.ok = function () {
                    $uibModalInstance.close($ctrl.selected.item);
              };
            
              $scope.cancel = function () {
                    $uibModalInstance.dismiss('cancel');
              };
        });
        app.filter('percentage', ['$filter', function ($filter) {
          return function (input, decimals) {
            return $filter('number')(input * 100, decimals) + '%';
          };
        }]);
        app.factory('$salesforceApiForVf',function($q, $rootScope,$http) {
                
                var apiVersion = 'v40.0';
                function toQueryString(obj) {
                    var parts = [],
                        i;
                    for (i in obj) {
                        if (obj.hasOwnProperty(i)) {
                            parts.push(encodeURIComponent(i) + "=" + encodeURIComponent(obj[i]));
                        }
                    }
                    return parts.join("&");
                }
                
            
                function nextRecords(org,result,deferred) {
                    
                    return request({
                        url: org.instance_url+result.data.nextRecordsUrl,
                        method:'GET',
                        headers:{"Authorization": "Bearer " + org.access_token},
                        body:null
                    },org,result,deferred);
        
                }
                
                function query(org,soql) {
                    return request({
                        url: org.instance_url+'/services/data/' + apiVersion + '/query?q='+encodeURIComponent(soql),
                        method:'GET',
                        headers:{"Authorization": "Bearer " + org.access_token},
                        body:null
                    },org);
        
                }
                
                function search(org,soql) {
                    return request({
                        url: org.instance_url+'/services/data/' + apiVersion + '/search?q='+encodeURIComponent(soql),
                        method:'GET',
                        headers:{"Authorization": "Bearer " + org.access_token},
                        body:null
                    },org);
        
                }
                
                function getSearchLayout(org,objects) {
                    return request({
                        url: org.instance_url+'/services/data/' + apiVersion + '/search/layout/?q='+objects,
                        method:'GET',
                        headers:{"Authorization": "Bearer " + org.access_token},
                        body:null
                    },org);
        
                }
                
            	function composite(org,compositeObject){
                    var compositeRequest=[]
                	if(compositeObject.query){
                        compositeRequest.push(
                    	{
                            url: '/services/data/' + apiVersion + '/query?q='+encodeURIComponent(compositeObject.query.soql),
                            method:'GET',
                            referenceId:compositeObject.query.referenceId
                        })
                           
                    }
                    if(compositeObject.fetchUrl){
                       compositeRequest.push(
                    	{
                            url: compositeObject.fetchUrl.pathplusquery,
                            method:'GET',
                            referenceId:compositeObject.fetchUrl.referenceId
                        })
                    }
                     return request({
                        url: org.instance_url+'/services/data/' + apiVersion + '/composite/',
                        method:'POST',
                        headers:{"Authorization": "Bearer " + org.access_token},
                        body:JSON.stringify({compositeRequest:compositeRequest})
                    },org);
                }
                
                function toolingQuery(org,soql) {
                    return request({
                        url: org.instance_url+'/services/data/' + apiVersion + '/tooling/query?q='+encodeURIComponent(soql),
                        method:'GET',
                        headers:{"Authorization": "Bearer " + org.access_token},
                        body:null
                    },org);
        
                }
                
                function fetchUrl(org,pathplusquery) {
                    return request({
                        url: org.instance_url+pathplusquery,
                        method:'GET',
                        headers:{"Authorization": "Bearer " + org.access_token},
                        body:null
                    },org);
        
                }
                
                
            
                function request(obj,org,prevresult,deferred,entityTypeName) {
                    if(!deferred){
                        deferred = $q.defer();
                        deferred.prevresult=[];
                    }
                    $http({
                      method: obj.method,
                      url: obj.url,
                      headers:obj.headers,
                      data:obj.body/*,
                      eventHandlers: {
                           progress: function(c) {
                               //console.log('Progress -> ' + c);
                               //console.log(c);
                           }
                       },
                       uploadEventHandlers: {
                           progress: function(e) {
                               //console.log('UploadProgress -> ' + e);
                               //console.log(e);
                           }
                       }*/
                    }).then(function successCallback(result) {
                        
                        if(result.data.done!=undefined&&!result.data.done){
                                                        
                            var incompleteresult=angular.copy(result)
                            incompleteresult.data.records=deferred.prevresult.concat(incompleteresult.data.records)
                            deferred.notify(incompleteresult);
                            
                            deferred.prevresult=deferred.prevresult.concat(result.data.records)
                            parallelRequest(obj,org,deferred,result.data.nextRecordsUrl,result.data.totalSize)
                            //nextRecords(org,result,deferred)
                        }
                        else{
                            if(deferred.prevresult.length>0){
                                result.data.records=deferred.prevresult.concat(result.data.records)
                            }
                            deferred.resolve(result);
                        }    
                    }, function errorCallback(response) {
                        console.log(response)
                        deferred.reject(response);
                    });
                    
                    return deferred.promise;
                }
                function urlCreator(nextUrl,length){
                	var commonurlpart=nextUrl.substr(0,nextUrl.lastIndexOf("-")+1)
                    var batchsize=Number(nextUrl.substr(nextUrl.lastIndexOf("-")+1,nextUrl.length))
                    var noofparalellerequest=length/batchsize
                    var urls=[]
                    for(i=1;i<noofparalellerequest;i++){
                    	urls.push(commonurlpart+i*batchsize)
                    }
                    return urls;
                }
            	function parallelRequest(obj,org,deferred,nextUrl,length) {
                    var urls=urlCreator(nextUrl,length)
                    var requests=[]
                    urls.forEach(function(url){
                        
                        requests.push($http({
                          method: obj.method,
                          url: org.instance_url+url,
                          headers:obj.headers,
                          data:obj.body
                        }))
                    
                    })
                    
                    
                    $q.all(requests).then(function successCallback(results) {
                       var allresultsrecords=deferred.prevresult
                       results.forEach(function(result){
                       		allresultsrecords=allresultsrecords.concat(result.data.records)
                       })
                       results[results.length-1].data.records=allresultsrecords
                       deferred.resolve(results[results.length-1]);   
                    }, function errorCallback(response) {
                        console.log(response)
                        deferred.reject(response);
                        // a1.slice( 0, 2 ).concat( a2 ).concat( a1.slice( 2 ) );
                    });
                    
                }
            
                return {
                    org: {},
                    query: query,
                    search:search,
                    toolingQuery:toolingQuery,
                    fetchUrl:fetchUrl ,
                    getSearchLayout:getSearchLayout,
                    composite:composite
                }; 
        })
        app.factory('$salesforceStreamingOLd',function(Sboject){//cometd
            this.init=function(){
                var $jq = jQuery.noConflict();
               
    
                $jq.cometd.subscribe('/u/CodeExectionStatusReport', function(message) {
                        console.log(message)
                        message=JSON.parse(message.data.payload.replace(/\'/g,'"'))
                        if(message.data=='Finalized')
                            Sboject.reload()
                        console.log(message)
                });
                
            }
            return this.init
        })
        app.factory('$salesforceStreaming',function(){//cometd
            this.cache={}
            var $jq = jQuery.noConflict();
            this.initialize=function(){
            	 $jq.cometd.init({
                       url: window.location.protocol+'//'+window.location.hostname+'/cometd/40.0/',
                       requestHeaders: { Authorization: 'OAuth {!$Api.Session_ID}'}
                });
            }
            this.subscribe=function(channel,callback){	
                $jq.cometd.subscribe(channel, function(message) {
                    	callback(message)
                });
                
            }
            return this
        })
       
        app.factory('FileplaoderUsingWorkers',function(){
            
        	var blob = new Blob([`self.requestFileSystemSync = self.webkitRequestFileSystemSync ||
                                                                 self.requestFileSystemSync;
                                    
                                    function makeRequest(url) {
                                      try {
                                        var xhr = new XMLHttpRequest();
                                        xhr.open('GET', url, false); // Note: synchronous
                                        xhr.responseType = 'arraybuffer';
                                        xhr.send();
                                        return xhr.response;
                                      } catch(e) {
                                        return "XHR Error " + e.toString();
                                      }
                                    }
                                    
                                    function onError(e) {
                                      postMessage('ERROR: ' + e.toString());
                                    }
                                    
                                    onmessage = function(e) {
                                      var data = e.data;
                                    
                                      // Make sure we have the right parameters.
                                      if (!data.fileName || !data.url || !data.type) {
                                        return;
                                      }
                                    
                                      try {
                                        var fs = requestFileSystemSync(TEMPORARY, 1024 * 1024 /*1MB*/);
                                    
                                        postMessage('Got file system.');
                                    
                                        var fileEntry = fs.root.getFile(data.fileName, {create: true});
                                    
                                        postMessage('Got file entry.');
                                    
                                        var arrayBuffer = makeRequest(data.url);
                                        var blob = new Blob([new Uint8Array(arrayBuffer)], {type: data.type});
                                    
                                        try {
                                          postMessage('Begin writing');
                                          fileEntry.createWriter().write(blob);
                                          postMessage('Writing complete');
                                          postMessage(fileEntry.toURL());
                                        } catch (e) {
                                          onError(e);
                                        }
                                    
                                      } catch (e) {
                                        onError(e);
                                      }
                                    };
        
        							
        							function uploadfile =function( files,success, error )
                                    {
                                    
                                         var fd = new FormData();
                                        
                                         var url = 'your web service url';
                                    
                                         /*angular.forEach(files,function(file){
                                         	fd.append('file',file);
                                         });*/
                                    
                                         //sample data
                                         var data ={
                                             "ContentDocumentId" : "069D00000000so2",
                                             "ReasonForChange" : "Marketing materials updated",
                                             "PathOnClient" : "Q1 Sales Brochure.pdf"
                                         }
                                         data={  
                                            "Description" : "Marketing brochure for Q1 2011",
                                            "Keywords" : "marketing,sales,update",
                                            "FolderId" : "005D0000001GiU7",
                                            "Name" : "Marketing Brochure Q1",
                                            "Type" : "json"
                                         }
                                    
                                     	 fd.append("data", JSON.stringify(data));
                                         var oReq = new XMLHttpRequest();
                                        
                                         oReq.onload = ajaxSuccess;
                                         oReq.open("post", "{{url}}");
                                         var boundary = '---------------------------';
                                         boundary += Math.floor(Math.random()*32768);
                                         boundary += Math.floor(Math.random()*32768);
                                         boundary += Math.floor(Math.random()*32768);
                                         oReq.setRequestHeader("Content-Type", 'multipart/form-data; boundary=' + boundary);
                                         
                                         oReq.send(new FormData(fd));
                                             /*$http.post(url, fd, {
                                                      withCredentials : false,
                                                      headers : {
                                                            'Content-Type' : undefined
                                                      },
                                                    transformRequest : angular.identity
                                             })
                                             .success(function(data)
                                             {
                                              console.log(data);
                                             })
                                             .error(function(data)
                                             {
                                              console.log(data);
                                             });*/
                                    }
        						`]);

            // Obtain a blob URL reference to our worker 'file'.
            var blobURL = window.URL.createObjectURL(blob);//If not need//window.URL.revokeObjectURL(blobURL);
            //new Blob([document.querySelector('#worker1').textContent]);///For loading from script
            
            var worker = new Worker(blobURL);
            worker.onmessage = function(e) {
              console.log(e.data)
            };
        	//worker.postMessage(); // Start the worker
        	worker.postMessage({fileName: 'GoogleLogo',
                      url: 'googlelogo.png', type: 'image/png'});
        	return worker;
        
        })
        app.factory('Remotefunction',function($q, $rootScope){
             return function(RemotefunctionFullName,data) {
                var deferred = $q.defer();
                Visualforce.remoting.Manager.invokeAction(
                    RemotefunctionFullName,
                    data,
                    function(result, event) {
                        $rootScope.$apply(function() {
                            if (event.status) {
                                deferred.resolve(JSON.parse(result));
                            } else {
                                deferred.reject(event);
                            }
                        })
                    },
                    { buffer: true, escape: false, timeout:  120000 }
                );
                return deferred.promise;
            }
        })
             
        app.directive("fixedHead", function($compile){
            var scrollLeft = 0;
            function combine(elements){
              
                angular.element(elements[1]).on('scroll', function(e){
                    //console.log('scrolling')
                    if(e.isTrigger){
                        e.target.scrollLeft = scrollLeft;
                    }else {
                        scrollLeft = e.target.scrollLeft;
                        angular.element(elements[0])[0].scrollLeft=angular.element(elements[1])[0].scrollLeft;
                        
                    }
                });
            }
            return {
                scope: {
                },
                link: function(scope, element, attrs, ngModel){
                    
                    combine(element.children('.'+attrs.combineHorizontalScrolls));
                    scope.$watch(
                        function () {
                            this.fixedHeaderwidth=[]
                            this.originaHeaderwidth=[]
                            var fixedHeaderwidth=this.fixedHeaderwidth
                            var originaHeaderwidth=this.originaHeaderwidth
                            element[0].querySelectorAll('[th-type="fixed"]').forEach(function(v){
                                fixedHeaderwidth.push(v.querySelector('div').offsetWidth)
                            })
                            element[0].querySelectorAll('[th-type="original"]').forEach(function(v){
                                originaHeaderwidth.push(v.querySelector('div').offsetWidth)
                            })
                            return {
                               fixedHeaderwidth: this.fixedHeaderwidth,
                               originaHeaderwidth: this.originaHeaderwidth
                            }
                       },
                       function (newval,oldval) {
                            
                            element[0].querySelectorAll('[th-type="fixed"]').forEach(function(v,k){
                                v.querySelector('div').style.width=newval.originaHeaderwidth[k]+"px"
                            })
                       }, //listener 
                       true //deep watch
                    );
                }
            };
        });
        app.directive('loader', function () {
            return {
                
                templateUrl: 'SVGloader2.html'
            };
        })
        app.directive('setClassWhenAtTop', function ($window) {
            var $win = angular.element($window); // wrap window object as jQuery object
        
            return {
                restrict: 'A',
                link: function (scope, element, attrs) {
                    var topClass = attrs.setClassWhenAtTop, // get CSS class from directive's attribute value
                        offsetTop = element[0].offsetTop; // get element's top relative to the document
                    if($win[0].pageYOffset >= offsetTop) {
                            element.addClass(topClass);
                    }
                    $win.on('scroll', function (e) {
                        if ($win[0].pageYOffset >= offsetTop) {
                            element.addClass(topClass);
                        } else {
                            element.removeClass(topClass);
                        }
                    });
                }
            };
        })

        app.factory('Performancemonitor',function(){
        	return {
                       getWatchers:function(root) {
                          root = angular.element(root || document.documentElement);
                          var watcherCount = 0;
                         
                          function getElemWatchers(element) {
                            var isolateWatchers = getWatchersFromScope(element.data().$isolateScope);
                            var scopeWatchers = getWatchersFromScope(element.data().$scope);
                            var watchers = scopeWatchers.concat(isolateWatchers);
                            angular.forEach(element.children(), function (childElement) {
                              watchers = watchers.concat(getElemWatchers(angular.element(childElement)));
                            });
                            return watchers;
                          }
                          
                          function getWatchersFromScope(scope) {
                            if (scope) {
                              return scope.$$watchers || [];
                            } else {
                              return [];
                            }
                          }
                         
                          return getElemWatchers(root);
                       }
                   }
        })
})();        
