 (function() { 
        var app=angular.module('StandardAngular',['StandardAngularInitilizer','ngAnimate','angularUtils.directives.dirPagination','ngSanitize','ui.bootstrap'])//,'cometd-reload'
        app.factory('jsonListOfObjectDefination',function($salesforceApiForVf,$rootScope){
            
            var jsonListOfObjectDefination=window.jsonListOfObjectDefination
            
            return jsonListOfObjectDefination
        })
        app.factory('SbojectConstruction',function(){
            var SobjectWrapperNew =function(SobjectWrapperParameters){
                this.UniqueiId=SobjectWrapperParameters['UniqueiId'];
                if(SobjectWrapperParameters['objectName'])
                    this.Key=SobjectWrapperParameters['objectName'];
                else
                    this.Key=SobjectWrapperParameters['Key'];
                this.Label=SobjectWrapperParameters['Label'];
                this.Name=SobjectWrapperParameters['Name'];
                this.Filters=SobjectWrapperParameters['Filters']||[];
                this.Fields=SobjectWrapperParameters['Fields']||[];
                this.displayFields=SobjectWrapperParameters['displayFields']||[];
                this.displayColums=SobjectWrapperParameters['displayColums']||[];
                
                this.RelatedListMap=SobjectWrapperParameters['RelatedListMap']||[];
                this.lookupViewDefination=SobjectWrapperParameters['lookupViewDefination']||{};
                this.NewViewDefination=SobjectWrapperParameters['NewViewDefination']||angular.copy(this);
                
                
                var wherepart='';
                if(this.Filters&&this.Filters.length>0){
                    if(this.filterExpresion==null)
                        wherepart=' where '+joinFilters(this.Filters,'1');
                    else{
                       wherepart=' where '+joinFilters(this.Filters,this.filterExpresion); 
                    }
                }
                this.query='Select '+this.Fields.join(',')+' From '+this.Key+wherepart;
                this.recentQuery='SELECT '+this.Fields.join(',')+' RecentlyViewed WHERE Type IN (\''+this.Key+'\') ORDER BY LastViewedDate DESC ';
                if(this.Fields&&this.Fields.indexOf('Id')>-1)
                    this.searchQuery='Find {} In Name FIELDS RETURNING '+this.Key+' ('+this.Fields.join(',')+' limit 100)';
                    //this.evalSearchQuery='this.searchQuery=this.searchQuery.replace( /({)(.*?)(})/, "{*some string*}" );'
                else if(this.Fields!=null&&this.Fields.indexOf('Id')==-1){
                    this.searchQuery='Find {} In Name FIELDS RETURNING '+this.Key+' (Id,'+this.Fields.join(',')+'  limit 100)';    
                }
                                        
    
            }
            var joinFilters=function(Filters,filterExpresion){
                var filterExpresionsplitted= filterExpresion.split('');
                
                for(var i=0;i<filterExpresionsplitted.length;i++){
                    try{
                    	if(Filters[parseInt(filterExpresionsplitted[i])-1])                  
                        	filterExpresionsplitted[i]=Filters[parseInt(filterExpresionsplitted[i])-1];
                    }catch(e){
                        
                    }
                }
                return  filterExpresionsplitted.join('') ;               
            }
            return {
                getSbojectWrapperNew:function(SobjectWrapperParameters){
                    return new SobjectWrapperNew(SobjectWrapperParameters)
                }
            }
        })
        app.factory('Sboject',function($q,$salesforceApiForVf,$rootScope,Object_ID,jsonListOfObjectDefination,AllMessages,checkJobStatus){
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
                 if(deferred)
                 return deferred.promise;
            }
            var fetchQuery=function(){
                var thisrefrence=this
                thisrefrence.data=[]
            	$salesforceApiForVf.query($salesforceApiForVf.org,this.query).then(
                        function(response){
                            thisrefrence.data=response.data.records
                            thisrefrence.totallength=response.data.records.length
                        },null,
                        function(response){
                            thisrefrence.data=response.data.records
                        }
                    )
            }
            
            var Sboject={}
            Sboject.init=function(jsonObject){
                var defrredlayout;
                fromJson(this,jsonObject)
                
                if(this.RelatedListMap){
                    this.RelatedListMap.forEach(function(v){
                        v.fetchQuery=fetchQuery;
                        v.reload=fetchQuery
                        v.fetchQuery()
                    })
                
                }else
                   defrredlayout=$q.defer()
                this.reload=fetchQuery
            	this.fetchQueryInit=fetchQueryInit
            	this.fetchQueryInit(defrredlayout)
                
                if(defrredlayout)
                defrredlayout.promise.then(function(layout){
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
            Object.size = function(obj) {
                var size = 0, key;
                for (key in obj) {
                    if (obj.hasOwnProperty(key)) size++;
                }
                return size;
            };
            
            return {
            	pagelevel:{},
            	blocklevel:{},
                fieldlevel:{},
				delete:function(level,blockIdentifier,messageIdentifier){
                	if(level=='fieldlevel'&&this[level][blockIdentifier][messageIdentifier]){
                		delete this[level][blockIdentifier][messageIdentifier]
            		}
                    if(level=='blocklevel'&&this[level][blockIdentifier][messageIdentifier]){
                        delete this[level][blockIdentifier][messageIdentifier]
                    }else if(level=='blocklevel')
						delete this[level][blockIdentifier]
                
					if(level=='pagelevel')
						delete this[level][blockIdentifier]
				},
				add:function(message,level,blockIdentifier,messageIdentifier){
					if(level=='fieldlevel'){
                        if(!this[level][blockIdentifier])
							this[level][blockIdentifier]={}
						this[level][blockIdentifier][messageIdentifier]=message
							
					}
                    if(level=='blocklevel'){
                        if(!this[level][blockIdentifier]){
                            this[level][blockIdentifier]={}
                        }    
                        if(!messageIdentifier){
                           messageIdentifier=new Date().getTime();     
                        }
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
                        if(fieldpath.indexOf('.')>-1){
                            fieldpath=fieldpath.substring(0,fieldpath.indexOf('.'))
                        }
                		try{
                        	return jsonListOfObjectDefination[key].fieldDescribeMap[fieldpath]
                        }catch(e){
                        	return null
                        }
                    }
        })
        app.controller('StandardAngularController', function($scope,jsonListOfObjectDefination,Sboject,AllMessages,$salesforceStreaming){
            $scope.AllMessages=AllMessages
            $salesforceStreaming.initialize()
            
            $scope.message='Loading'

            $scope.Sboject=Sboject
            $scope.Sboject.init(window.jsonObject)
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
												AllMessages.delete("pagelevel",value.Key,'New')
												reloadFactory(reloadlist)
                                            }else{
												AllMessages.add({
                                                 show:true,
                                                 removable:true,
                                                 styleClass:'error-message',
                                                 content:customexceptionMessages(result)
                                                },'pagelevel',value.Key,'New')
											
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
                                                AllMessages.delete("pagelevel",Id)//value.Key,Id)
                                                reloadFactory(reloadlist)
                                            }else{
                                                AllMessages.add({
                                                 show:true,
                                                 removable:true,
                                                 styleClass:'error-message',
                                                 content:customexceptionMessages(result)
                                                },'pagelevel',Id)//value.Key,Id)
                                                
                                            }
                                            delete value.progress[Id]
                                            
                                            scope.operation=false
                                        })
                                        if(!value.progress)
                                            value.progress={}
                                        value.progress[Id]=true
                                    }
                        },
                		saveAll:function(value,scope,reloadlist){
                                    scope.operation="Saving all..."
                                    value.updatedValues=angular.fromJson(JSON.stringify( value.updatedValues, function( key, value ) {
                                        if( key === "$$hashKey" ) {
                                            return undefined;
                                        }
                                        if (this[key] instanceof Date) {
                                           return this[key].getTime();
                                        }
                                        return value;
                                    }))
                                    /*if(value.updatedValues&&!Id){
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
                                    else*/ if(value.updatedValues){
                                        var data={}
                                        data=JSON.parse(JSON.stringify(value.updatedValues))
                                        remoteSave(data,"type").then(function(result){
                                            console.log(result);
                                            if(result=="success"){
                                                delete value.updatedValues
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
                                        for (Id in value.updatedValues) {
                                            if ( value.updatedValues.hasOwnProperty(Id) )
                                                value.progress[Id]=true
                                        }
                                        
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
                                                AllMessages.delete("pagelevel",Id)//value.Key,Id)
                                            }else{
                                               AllMessages.add({
                                                 show:true,
                                                 removable:true,
                                                 styleClass:'error-message',
                                                 content:customexceptionMessages(result)
                                                },"pagelevel",Id)//value.Key,Id)
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
        app.factory('remoteSave', ['$q', '$rootScope', function($q, $rootScope,VisualforceRemotingManager) {
            return function(data,type) {
                var deferred = $q.defer();
                Visualforce.remoting.Manager.invokeAction(
                    'StandardAngularController.save',
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
                    'StandardAngularController.insertData',
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
                    'StandardAngularController.deleteData',
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
        app.filter('groupBy', function($parse) {
            return _.memoize(function(items, field) {
                var getter = $parse(field);
                return _.groupBy(items, function(item) {
                    return getter(item);
                });
            });
        });
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
        app.controller("Default_BlockController",function($scope,$parse,$uibModal,$document,$rootScope,extractRowMetadata,Sboject,AllMessages,customexceptionMessages){
                  
        })
        app.controller("RelatedList_BlockController",function($scope,$filter,$parse,$uibModal,$document,$rootScope,extractRowMetadata,Sboject,AllMessages,customexceptionMessages){
                  $scope.extractRowMetadata=extractRowMetadata
                  $scope.value.pageSize=10;$scope.value.currentPage=1
                  $scope.$watch(function(){
                     return $scope.value.data 
                  },function(newval,oldval){
                     $scope.filterdata()         
                  })
                  $scope.filterdata = function (filtervalue) {
                    var filtered = $filter('filter')($scope.value.data, filtervalue);
                    //filtered = $filter('orderBy')(filtered, 'name');
                    $scope.value.filtereddata = filtered;
                  };
        })
        app.controller("Object_BlockController",function($scope,$parse,$uibModal,$document,$rootScope,extractRowMetadata,Sboject,AllMessages,customexceptionMessages){
                  $scope.extractRowMetadata=extractRowMetadata
        })
		app.controller("Message_BlockController",function($scope,$parse,$uibModal,$document,$rootScope,extractRowMetadata,Sboject,AllMessages,customexceptionMessages){
                  
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
        app.controller("Default_ButtonController",function($scope){
                  $scope.action=function(){
                  	console.log('button clicked')
                    
                  }
        })
        app.controller("New_ButtonController",function($scope,$uibModal,$document,SbojectConstruction,Sboject,remoteInsert,reloadFactory,extractRowMetadata ,AllMessages,customexceptionMessages){
            	  
                  var $uibModalInstance
                  $scope.AllMessages=AllMessages
                  $scope.action=function(){
                        console.time('createNew')
                        console.log('new button clicked')
                        $scope.uibModalInstance=$uibModal.open({
                            animation: true,
                            templateUrl: 'newSobjectModal.html',
                            size:'lg',
                            scope:$scope,
                            backdrop :'static',
                            appendTo:angular.element($document[0].getElementById("controller"))
                        })
                        $scope.uibModalInstance.result.then(function (data) {
                            
                        }, function () {
                                    
                        });
                      	
                    
                  }
                  var relatedProperties=[]
                  $scope.newRelatedList= SbojectConstruction.getSbojectWrapperNew($scope.data.NewViewDefination)
                  console.log($scope.newSobject)
                  $scope.newRelatedList.data=[];
            	  $scope.newRelatedList.prototype={}
            
                  $scope.newRelatedList.displayFields.forEach(function(v) {
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
                  var row=angular.copy($scope.newRelatedList.prototype)
                  row.Id=$scope.newRelatedList.data.length
            	  $scope.newRelatedList.data.push(row)
                  $scope.addMoreNew=function(){
                     row=angular.copy($scope.newRelatedList.prototype)
                     if(!$scope.newRelatedList.data)
                         $scope.newRelatedList.data=[]
                         
                  	 row.Id=$scope.newRelatedList.data.length
                     $scope.newRelatedList.data.push(row)
                  }
                  $scope.removeNew=function(index){
                      $scope.newRelatedList.data.slice(index,1)
                  }
            
                  $scope.save = function () {
                      var tosave=[]
                      $scope.newRelatedList.data.forEach(function(v1,k){
                          var v=angular.copy(v1)
                          if($scope.newRelatedList.updatedValues[k])
                          for (var prop in $scope.newRelatedList.updatedValues[k]) {
                              if ($scope.newRelatedList.updatedValues[k].hasOwnProperty(prop)) {
                                  
                                  v[prop] = $scope.newRelatedList.updatedValues[k][prop];  
                                      
                              }
                          }
                          for (var prop in v){
                          		  var md=extractRowMetadata($scope.newRelatedList.Key,prop)
                                  if(md&&md.relationshipName){
                                    if($scope.newRelatedList.updatedValues[k])
                                  	v[md.name] = $scope.newRelatedList.updatedValues[k][prop]
                                    
                                    if(v[prop]&&!v[md.name])
                                    	v[md.name] =v[prop].Id;
                                    delete v[md.relationshipName]
                                  }
                      	  }
						  delete v.Id
                          tosave.push(v)
                      })
                      tosave=angular.fromJson(JSON.stringify( tosave, function( key, value ) {
                                        if( key === "$$hashKey" ) {
                                            return undefined;
                                        }
                                        if (this[key] instanceof Date) {
                                           return this[key].getTime();
                                        }
                                        return value;
                                    }))
                      $scope.servering=true
                      remoteInsert(tosave).then(function(result){
                          
                          
                          if(result.data.length==0){
                              
                              //delete relatedlist.creatingNew
                              AllMessages.add({
                                                 show:true,
                                                 removable:true,
                                                 styleClass:'error-message',
                                                 content:customexceptionMessages(result.message)
                                                },'blocklevel',$scope.newRelatedList.Key+'New')
                          }else{
                              AllMessages.delete("blocklevel",$scope.newRelatedList.Key+'New')
                              reloadFactory([Sboject,$scope.data])
                              delete $scope.newRelatedList.data
                              delete $scope.newRelatedList.updatedValues
                              $scope.addMoreNew()
                              $scope.uibModalInstance.close(result);
                          }
                          $scope.servering=false
                      },function(error){
                          console.log(error);
                          $scope.servering=false
                          alert("something went wrong  try again")
                      })
                      //
                  };
            	  $scope.cancel = function () {
                            $scope.uibModalInstance.dismiss('cancel');
                  };
            
                  
        })
        app.controller("Save_ButtonController",function($scope,Sboject,dataOperation,AllMessages,customexceptionMessages){
                  $scope.action=function(){
                  	console.log('save button clicked',$scope)
                    dataOperation.save($scope.data,$scope.data.data[0].Id,$scope,[Sboject])
                  }
        })
        
        app.directive("fieldLabel", function($compile,$templateCache){
            return {
                scope: {
                    labelname: '<',
                    fieldtype:'<',
                    currentobject:'<',
                    ctrl:"=?"
                },
                transclude: true,
                replace:true,
                controller:['$controller', '$scope','ControllerChecker', function($controller, $scope,ControllerChecker) {
                  if(ControllerChecker.exists($scope.blockType+'_fieldLabelController')){
                  	  $scope.ctrl=$scope.blockType+'_fieldLabelController'
                  }else{
                      $scope.ctrl='Default_fieldLabelController'
                  }
                  var ctrl= $controller($scope.ctrl, {$scope: $scope});
                  return ctrl;
                }],
                link:{
                    pre: function( scope, element, attrs ) {
                    },
                	post :function(scope, element, attrs,ctrl){
                          scope.getContentUrl = function() {
                              var templateName=scope.blockType.toLowerCase()+'_fieldLabel.html'
                              if(document.querySelector('script[type="text/ng-template"][id="'+templateName+'"]'))
                                  return templateName
                              return "Default_fieldLabel.html"
                   		  }
                          var linkFn = $compile(scope.labelname);//$templateCache.get(scope.getContentUrl())
                          var content = linkFn(scope);
                          element.append(content);
                          scope.fieldLabel={
                              
                          }
                }
            }
            };    
        });
        app.controller("Default_fieldLabelController",function($scope,$parse,$uibModal,$document,$rootScope,Sboject,AllMessages,customexceptionMessages){
                  
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
                          if(scope.a)
                          scope.field={
                              key:scope.a,
                              value:scope.b,
                              actual:scope.b
                          }
                          
                   		  scope.rowMetadata=extractRowMetadata(scope.metadataKey,scope.metadataApiName)
                          function update(){ 
                               
                              if(scope.fieldType=="LOOKUP"){
                                scope.field.value = $parse(scope.field.key.substring(0,scope.field.key.indexOf('r.')+1))(scope.$parent) 
                                if(scope.field.key.slice( -3 )=="__r")
                                    scope.field.value = $parse(scope.field.key)(scope.$parent)
                                    scope.field.actual=scope.field.value;
                              }else if(scope.fieldType=="DATE"){
                                scope.field.value = new Date($parse(scope.field.key)(scope.$parent))
                                scope.field.actual=scope.field.value;
                                if(scope.currentobject&&scope.currentobject.updatedValues&&scope.rowData&&
                                   scope.currentobject.updatedValues[scope.rowData.Id]&&
                                   scope.currentobject.updatedValues[scope.rowData.Id][scope.field.key.replace(scope.parentref,'')]){ 
                                          scope.field.value=scope.currentobject.updatedValues[scope.rowData.Id][scope.field.key.replace(scope.parentref,'')]
                                   		  scope.field.updated=true
                                }
                              }else{
                                scope.field.value = $parse(scope.field.key)(scope.$parent)
                                scope.field.actual=scope.field.value;
                                if(scope.currentobject&&scope.currentobject.updatedValues&&scope.rowData&&
                                   scope.currentobject.updatedValues[scope.rowData.Id]&&
                                   scope.currentobject.updatedValues[scope.rowData.Id][scope.field.key.replace(scope.parentref,'')]){ 
                                          scope.field.value=scope.currentobject.updatedValues[scope.rowData.Id][scope.field.key.replace(scope.parentref,'')]
                                   		  scope.field.updated=true
                                }
                              }
                              
                          }
                  		  update()
                  		  if(scope.currentobject){
                               if(!scope.currentobject.updatedValues) {
                                    scope.currentobject.updatedValues={}
                               }  
                          }
						  scope.$watch(
                              function(){return $parse(scope.field.key)(scope.$parent);},
                              function(newvalue,oldvalue){
									update()
                                    //console.log(newvalue,oldvalue)
                              }, true
                          )
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
                      		  if(!scope.rowMetadata)
                                  scope.rowMetadata=extractRowMetadata(scope.metadataKey,scope.metadataApiName)
                              if(scope.field.key.indexOf('__r.')>-1){
                                //$parse(scope.a.substring(0,scope.a.indexOf('r.'))).assign(scope.$parent.$parent,scope.field.value)
                                //if(scope.a.slice( -3 )=="__r")
                                   // scope.b = $parse(scope.a).assign(scope.$parent.$parent,scope.field.value) 
                              }else{
                                //$parse(scope.a).assign(scope.$parent.$parent, scope.field.value)
                              }
                      
                              if(scope.currentobject){
                                  var data={}  
                                  if(scope.rowData&&!scope.currentobject.updatedValues[scope.rowData.Id]){
                                      var data={}
                                      data['Id']=scope.rowData.Id
                                      
                                      if(scope.fieldType=="LOOKUP"){
                                          //data[(scope.field.key.substring(0,scope.field.key.indexOf('__r.'))+'__c').replace(scope.parentref,'')]=scope.field.value?scope.field.value.Id:null
                                      	  data[scope.rowMetadata.name]=scope.field.value?scope.field.value.Id:null
                                      }
                                      if(scope.fieldType=="operationselect"){
                                          
                                      }
                                      if(!(scope.fieldType=="operationselect"||scope.fieldType=="LOOKUP")){
                                          //data[scope.field.key.replace(scope.parentref,'')]=scope.field.value//eval('scope.rowData.'+scope.a.replace(scope.parentref,''))
                                      	  data[scope.rowMetadata.name]=scope.field.value
                                      }
                                      scope.currentobject.updatedValues[scope.rowData.Id]=data
									  scope.field.updated=true                                      
                                  }else if(scope.rowData&&scope.currentobject.updatedValues[scope.rowData.Id]){
                                      if(scope.fieldType=="LOOKUP"){
                                          //scope.currentobject.updatedValues[scope.rowData.Id][(scope.field.key.substring(0,scope.field.key.indexOf('__r.'))+'__c').replace(scope.parentref,'')]=scope.field.value?scope.field.value.Id:null
                                      	  scope.currentobject.updatedValues[scope.rowData.Id][scope.rowMetadata.name]=scope.field.value?scope.field.value.Id:null
                                      }
                                      if(scope.fieldType=="operationselect"){
                                          
                                      }
                                      if(!(scope.fieldType=="operationselect"||scope.fieldType=="LOOKUP")){ 
                                          //scope.currentobject.updatedValues[scope.rowData.Id][scope.field.key.replace(scope.parentref,'')]=scope.field.value//eval('scope.rowData.'+scope.a.replace(scope.parentref,''))
                                      	  scope.currentobject.updatedValues[scope.rowData.Id][scope.rowMetadata.name]=scope.field.value
                                      }
                                      scope.field.updated=true
                                  }
                              }
                          if(scope.rowData&&scope.currentobject&&(scope.field.actual==scope.field.value
                                                   ||(scope.field.actual  instanceof Date && scope.field.actual.getTime()===scope.field.value.getTime()))){
                              delete scope.field.updated
                              
                              if(Object.keys(scope.currentobject.updatedValues[scope.rowData.Id]).length<=2)
                                  delete scope.currentobject.updatedValues[scope.rowData.Id]
                              else
                                  delete scope.currentobject.updatedValues[scope.rowData.Id][scope.rowMetadata.name]//delete scope.currentobject.updatedValues[scope.rowData.Id][scope.a.replace(scope.parentref,'')]
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
        app.controller("LOOKUP",function($scope,$parse,$uibModal,$document,$salesforceApiForVf,Sboject,SbojectConstruction,extractRowMetadata,AllMessages,customexceptionMessages){
                   var scope=$scope
                   var $uibModalInstance;
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
                                    
                                    scope.rowParent.lookupViewDefination[scope.rowMetadata['referenceTo'][0]]=SbojectConstruction.getSbojectWrapperNew(SObjectSearchMap)
                                    scope.relatedSobject=scope.rowParent.lookupViewDefination[scope.rowMetadata['referenceTo'][0]]
                                    scope.relatedSobject.data=[]
                                    scope.filterName=scope.relatedSobject.displayColums[0].apiName
                                }
                           )
                       }
                       else if(scope.rowParent.lookupViewDefination&&scope.rowMetadata&&scope.rowParent.lookupViewDefination[scope.rowMetadata['referenceTo'][0]]){
                           scope.relatedSobject=scope.rowParent.lookupViewDefination[scope.rowMetadata['referenceTo'][0]]
                           scope.relatedSobject.data=[]
                           scope.filterName=scope.relatedSobject.displayColums[0].apiName
                       }
                       
                   })
                   scope.lookupRemove=function(){
                            scope.field.value=null;
                           //scope.update();
                   }
                   if(!scope.rowMetadata)
                   	scope.rowMetadata=extractRowMetadata(scope.metadataKey,scope.metadataApiName)
                   
                   scope.lookup=function(searchValue,size) {
                            console.log(scope.rowMetadata);console.log(scope.rowData);console.log(scope.rowParent);
                            $uibModalInstance= $uibModal.open({
                              animation: true,
                              templateUrl: 'lookupModal.html',
                              size: size,
                              scope:scope,
                              appendTo:angular.element($document[0].getElementById("controller"))
                            });
                        
                            $uibModalInstance.result.then(function (selectedItem) {
                                    scope.field.value=selectedItem
                                
                                    //scope.update(scope.b)
                                
                            }, function () {
                             
                            });
                    
                   }
                   
                   scope.search=function(filterValue){
                        scope.message="Loading.."
                        scope.servering=true
                        $salesforceApiForVf.search($salesforceApiForVf.org, scope.relatedSobject.searchQuery.replace( /({)(.*?)(})/, "{"+filterValue+"}" )).then(
                              function(data){
                                  scope.relatedSobject.data=data.data.searchRecords
                                  scope.servering=false
                              },function(error){
                                    scope.message="No results found"
                                    scope.servering=false
                              }
                        )
                   }
                   
                   if(scope.filterValue=='' || scope.filterValue==undefined ||( scope.filterValue && scope.filterValue.length < 3) ){
                       $scope.message="Please enter search term having more than three characters"
                   }
                   scope.select=function(item,event){
                       $uibModalInstance.close({Id:item.Id,Name:item.Name});
                   }
              
                   scope.ok = function () {
                        $uibModalInstance.close($ctrl.selected.item);
                   };
            
              	   scope.cancel = function () {
                    	$uibModalInstance.dismiss('cancel');
              	   };
                                      
        })
        app.controller("BOOLEAN",function($scope,$parse,$uibModal,$document,$rootScope,Sboject,AllMessages,customexceptionMessages){
                   var scope=$scope
                   scope.toggleBoolean=function(){
                       //scope.b=scope.b?false:true
                       //scope.update();
                   }
                                   
        })
        app.controller("OPERATIONSELECT",function($scope,$parse,$uibModal,$document,$rootScope,Sboject,AllMessages,customexceptionMessages){
                   $scope.field.actual=false
                                   
        })
        app.controller("OPERATIONEDIT",function($scope,$parse,$uibModal,$document,$rootScope,dataOperation,Sboject,AllMessages,customexceptionMessages){
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
        app.factory('VisualforceRemotingManager',function($q, $rootScope){
            function dispatch(fn, args) {
                fn = (typeof fn == "function") ? fn : window[fn];  // Allow fn to be a function object or the name of a global function
                return fn.apply(this, args || []);  // args is optional, use an empty array by default
            }
 
            return function(argumentArray) {
                
                var deferred = $q.defer();
                dispatch(Visualforce.remoting.Manager.invokeAction,argumentArray)
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
                    scope.firstheaderwidth=[]
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
		app.directive('ngEnter', function () {
            return function (scope, element, attrs) {
                element.bind("keydown keypress", function (event) {
                    if(event.which === 13) {
                        scope.$apply(function (){
                            scope.$eval(attrs.ngEnter);
                        });
         
                        event.preventDefault();
                    }
                });
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
                        offsetTop = element[0].offsetTop//element[0].getBoundingClientRect().top;//element[0].offsetTop; // get element's top relative to the document
                    if($win[0].pageYOffset >= offsetTop) {
                            element.addClass(topClass);
                           element.removeClass(attrs.relativeclass);
                    }
                    $win.on('scroll', function (e) {
                        if ($win[0].pageYOffset >= offsetTop) {
                            element.addClass(topClass);
                            element.removeClass(attrs.relativeclass);
                        } else {
                            element.addClass(attrs.relativeclass);
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
        app.directive('trackDigests', function trackDigests($rootScope) {
            function link($scope, $element, $attrs) {
                var count = 0;
                function countDigests(newValue, oldValue) {
                    count++;
                    $element[0].innerHTML = '$digests: ' + count;
                }
                $rootScope.$watch(countDigests);
            }
            return {
                restrict: 'EA',
                link: link
            };
        });
})();
