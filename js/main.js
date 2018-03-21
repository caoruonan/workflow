var myUIRoute = angular.module('MyUIRoute', [
	'ui.router',
	"ui.bootstrap"
]);

myUIRoute.config(['$stateProvider','$urlRouterProvider',function($stateProvider,$urlRouterProvider) {
	$urlRouterProvider.otherwise("/demo");
	$stateProvider
		.state('demo',{
			url:'/demo',
			templateUrl: "views/demo.html"
		})

}]);

myUIRoute.controller('DemoController', ['$scope', '$uibModal',function($scope, $uibModal){
            $scope.model = {};//存储数据
            //判断遍历存储函数
            $scope.cyclicStorage = function () {
                $scope.startList = [];
                $scope.taskList = [];
                $scope.endList = [];
                $scope.labelList = [];
                angular.forEach($scope.taskSummaryList, function (data) {
                    if (data.nodeType == 'START') {
                        $scope.startList.push(data);
                    } else if (data.nodeType == 'END') {
                        $scope.endList.push(data);
                    } else if (data.nodeType == 'TASK') {
                        $scope.taskList.push(data);
                    } else if (data.nodeType == 'LABEL') {
                        $scope.labelList.push(data);
                    }
                })
            };
            $scope.count = 0;
            // 判断页面是否加载完毕
            $scope.repeatFinish = function () {
                $scope.count++;//动态获取存储DOM类型个数，判断是否实已经例化jsplumb
                if ($scope.count >= $scope.nodesType.unique().length - 1) {
                    angular.forEach($scope.taskSummaryList, function (data) { //动态设置初始DOM的位置
                        $('#' + data.defineId).css('top', data.location.top).css('left', data.location.left);
                    });
                    $scope.jsPlumbInit();
                    $scope._initConnection();
                    $scope._configContextMenu();
                }
            };
            // jsplumb配置函数
            $scope.jsPlumbInit = function () {
                jsPlumb.ready(function () {
                    $scope.instance = jsPlumb.getInstance({
                        Connector: "Straight",
                        DragOptions: {cursor: 'pointer'},
                        Endpoint: ["Dot", {radius: 0.001}],
                        Overlays: [
                            ["Arrow", {
                                location: 1,
                                id: "arrow",
                                length: 14,
                                foldback: 0.7
                            }],
                            ["Label", {label: ""}]//线上文字
                        ],
                        Container: 'Content-Main'
                    });
                    $scope.dom = angular.element(".item");//获取对象节点
                    //获取节点成功后需要调用的函数
                    if ($scope.dom.length > 0) {
                        $scope._makeSource($scope.dom);
                        $scope._makeTarget($scope.dom);
                    }
                    //线上右键事件
                    $scope.instance.bind("contextmenu", function (c) {
                        $scope.contextmenuCoon = c;//用于调用右键菜单函数回调
                    });
                    //连线成功的事件回调
                    $scope.instance.bind("connection", function (params) {
                        var conn = params.connection;
                        conn.addClass('hideStyle');
                        if ($(params.target).attr('category') == 'label') {
                            conn.hideOverlays();
                            conn.removeClass('hideStyle');
                            return false;
                        }
                        if ($(params.source).attr('category') == 'label') {
                            conn.removeClass('hideStyle');
                            return false;
                        }
                        conn.postFrom = conn.getData().postFrom === undefined ? true : conn.getData().postFrom;
                        if (!conn.getLabel()) {
                            conn.setLabel(('送' + conn.target.innerText).replace(/[ ]|(^s*)|(s*$)|[\r\n]/g, ""));
                        }
                        if ($scope.judge(params)) {
                            $scope.instance.detach(conn, {fireEvent: false});//解绑
                        }
                        var top = conn.getData().top || conn._jsPlumb.overlays.__label.canvas.offsetTop - 8;
                        var left = conn.getData().left || conn._jsPlumb.overlays.__label.canvas.offsetLeft - 35;
                        $scope.$apply(function () {
                            $scope.addLabel = {
                                "defineId": new Date().getTime().toString(),
                                "nodeType": 'LABEL',
                                "name": conn.getLabel(),
                                "connId": conn.id,
                                "location": {
                                    "top": top,
                                    "left": left
                                },
                                "sourceId": conn.sourceId,
                                "targetId": conn.targetId
                            };
                            $scope.taskSummaryList.push($scope.addLabel);//添加新的元素
                            $scope.cyclicStorage();//调用循环存储函数
                            $scope.repeatLabel = function (data) {
                                $scope.domLabel = $('#' + data.defineId + '');
                                $scope.domLabel.css('top', data.location.top).css('left', data.location.left); //添加元素定位
                                $scope._draggable($scope.domLabel);
                                $scope._makeSource($scope.domLabel);
                                $scope._makeTarget($scope.domLabel);
                                $scope.instance.connect({
                                    source: data.sourceId,
                                    target: data.defineId,
                                    label: data.name
                                });
                                $scope.instance.connect({
                                    source: data.defineId,
                                    target: data.targetId,
                                    label: data.name
                                });
                            };
                            $scope.labelListFlag = [];
                            $scope.repeatFinish = function () {
                                if ($scope.initConnectionFlag) {
                                    for (var i = 0; i < $scope.labelList.length; i++) {
                                        $scope.repeatLabel($scope.labelList[i])
                                    }
                                    $scope.initConnectionFlag = false;
                                    $scope.labelListFlag = angular.copy($scope.labelList)
                                } else {
                                    var connections = $scope.labelListFlag;
                                    $scope.connectionsFlag = false;
                                    for (var i = 0; i < connections.length; i++) {
                                        if (connections[i].connId == $scope.addLabel.connId) {
                                            $scope.connectionsFlag = true;
                                        }
                                    }
                                    if (!$scope.connectionsFlag) {
                                        $scope.repeatLabel($scope.addLabel)
                                    }
                                }
                            };
                        });
                    });
                });
            };
            //初始化连接状态显示，初始的DOM显示
            $scope._initConnection = function () {
                angular.forEach($scope.routerList, function (data) {
                    $scope.instance.connect({
                        source: data.fromNodeDefineId,
                        target: data.toNodeDefineId,
                        label: data.name,
                        postFrom: data.postFrom,
                        data: {
                            postFrom: data.postFrom,
                            left: data.location ? data.location.left : 0,
                            top: data.location ? data.location.top : 0
                        }
                    });
                });
                $scope.initConnectionFlag = true;
            };
            var defaultAnchors = ["Top", "Right", "Bottom", "Left", [0.25, 0, 0, -1], [0.75, 0, 0, -1], [0.25, 1, 0, 1], [0.75, 1, 0, 1]
                , [0, 0.25, 0, -1], [0, 0.75, 0, -1], [1, 0.25, 0, 1], [1, 0.75, 0, 1]];
            // makeSource
            $scope._makeSource = function ($el) {
                $scope._draggable($el);
                angular.forEach($el, function (dom) {
                    if ($(dom).attr('category') == 'task') {
                        $scope.instance.makeSource(dom, {
                            filter: ".ep",
                            anchor: defaultAnchors,
                            connectorStyle: {strokeStyle: "#DEDEDE", lineWidth: 2},
                            maxConnections: 20,
                            onMaxConnections: function () {
                                alert( "最大连接数！");
                                return;
                            }
                        })
                    } else {
                        $scope.instance.makeSource(dom, {
                            filter: ".ep",
                            anchor: "Center",
                            connectorStyle: {strokeStyle: "#DEDEDE", lineWidth: 2},
                            maxConnections: 1,
                            onMaxConnections: function () {
                                alert("最大连接数！");
                                return;
                            }
                        });
                    }
                })
            };
            // makeTarget
            $scope._makeTarget = function ($el) {
                $scope._draggable($el);
                angular.forEach($el, function (dom) {
                    if ($(dom).attr('category') == 'task') {
                        $scope.instance.makeTarget(dom, {
                            maxConnections: 20,
                            anchor: defaultAnchors,
                            onMaxConnections: function () {
                                alert("最大连接数！");
                                return;
                            }
                        })
                    } else if ($(dom).attr('category') == 'end') {
                        $scope.instance.makeTarget(dom, {
                            maxConnections: 1,
                            anchor: defaultAnchors,
                            onMaxConnections: function () {
                                alert("最大连接数！");
                                return;
                            }
                        })
                    } else {
                        $scope.instance.makeTarget(dom, {
                            anchor: "Center",
                            maxConnections: 1,
                            onMaxConnections: function () {
                                alert("最大连接数！");
                                return;
                            }
                        })
                    }
                })
            };
            // 拖拽函数，元素可拖拽
            $scope._draggable = function ($el) {
                $scope.instance.draggable($el, {
                    grid: [15, 15],
                    containment: "#Content-Main"
                });
            };
            //设置左侧DOM拖动添加
            angular.element(".basic").draggable({
                helper: "clone",
                zIndex: 10,
                revert: "invalid",
                start: function (e) {
                    $scope._initDroppable(e.currentTarget.id);
                }
            });
            //关于拖放盒子的设置
            $scope._initDroppable = function (type, text) {
                $("#Content-Main").droppable({
                    drop: function (event, ui) {
                        $scope.$apply(function () {
                            $scope.addData = {
                                "defineId": new Date().getTime().toString(),
                                "nodeType": type,
                                "location": {
                                    "top": ui.offset.top,
                                    "left": ui.offset.left
                                }
                            };
                            $scope.taskSummaryList.push($scope.addData);//添加新的元素
                            $scope.cyclicStorage();//调用循环存储函数
                            $scope.repeatFinish = function () {
                                $scope.dom = angular.element($('#' + $scope.addData.defineId + ''));
                                $scope.coordinateJudgment($scope.dom); //添加元素定位
                                $scope._draggable($scope.dom);
                                $scope._makeSource($scope.dom);
                                $scope._makeTarget($scope.dom);
                            };
                        });
                    }
                })
            };
            //坐标判断函数,动态设置DOM坐标
            $scope.coordinateJudgment = function (dom) {
                var top = parseInt($scope.addData.location.top) - $('#' + $scope.addData.defineId).parent().offset().top;
                var left = parseInt($scope.addData.location.left) - $('#' + $scope.addData.defineId).parent().offset().left;
                var parentTop = $('#' + $scope.addData.defineId).parent().outerHeight() - dom.outerHeight();
                var parentleft = $('#' + $scope.addData.defineId).parent().outerWidth() - dom.outerWidth();
                if (top < 0) {
                    top = 0;
                }
                if (left < 0) {
                    left = 0;
                }
                if (top > parentTop) {
                    top = parentTop;
                }
                if (left > parentleft) {
                    left = parentleft;
                }
                dom.css('top', top).css('left', left);
            };
            //判断连线的函数
            $scope.judge = function (params) {
                var targetCategory = $('#' + params.targetId).attr('category');
                var sourceCategory = $('#' + params.sourceId).attr('category');
                if (params.targetId == params.sourceId) {
                    alert("自己不能连接自己！");
                    return true;
                } else if (targetCategory == 'start') {
                    alert("开始节点不能做target！");
                    return true;
                } else if (sourceCategory == 'end') {
                    alert("结束节点不能做source！");
                    return true;
                }
            };

            // 右键菜单函数，引用jquery.contextmenu的js以及css
            $scope._configContextMenu = function () {
                $.contextMenu('destroy');
                $.contextMenu({
                    selector: '.itemMenu',
                    build: function (trigger) {
                        if (trigger.attr("category") == 'task') {
                            menu = {
                                items: {
                                    "edit": {name: "编辑节点", icon: "edit"},
                                    "delete": {name: "删除节点", icon: "delete"}
                                }
                            };
                            menu.items.edit.callback = function () {
                                var modalInstance = $uibModal.open({
                                    templateUrl: 'edit.html',
                                    controller: ["$scope", '$window', "$uibModalInstance", '$uibModal', '$timeout', function (scope, $window, $uibModalInstance, $uibModal, $timeout) {
                                        scope.title = '编辑节点';
                                        scope.orgList = $scope.orgList;
                                        scope.postslist = $scope.postslist;
                                        scope.posts = {};
                                        scope.sourceConnectionsList = [];
                                        angular.forEach($scope.instance.getConnections({source: [trigger.context.id]}), function (data) {
                                            if ($('#' + data.targetId).attr('category') != 'label') {
                                                scope.sourceConnectionsList.push({
                                                    id: data.id,
                                                    source: data.source.innerText,
                                                    label: data.getLabel(),
                                                    target: data.target.innerText,
                                                    postFrom: data.postFrom
                                                })
                                            }
                                        });
                                        angular.forEach($scope.taskSummaryList, function (data) {
                                            if (data.defineId == trigger.context.id) {
                                                scope.model = {};
                                                scope.posts.participantInfo = [];
                                                angular.copy(data, scope.model);
                                            }
                                        });
                                        scope.btn_ok = function () {
                                            angular.forEach($scope.taskSummaryList, function (data) {
                                                if (trigger.context.id == data.defineId) {
                                                    angular.copy(scope.model, data);
                                                }
                                            });
                                            
                                            angular.forEach($scope.instance.getAllConnections(), function (data) {
                                                if (data.targetId == scope.model.defineId) {
                                                    data.setLabel(('送' + scope.model.name).replace(/[ ]|(^s*)|(s*$)|[\r\n]/g, ""));
                                                }
                                                angular.forEach($scope.labelList, function (item) {
                                                    if (item.connId && item.connId == data.id) {
                                                        item.name = data.getLabel();
                                                    }
                                                })
                                            });
                                            $uibModalInstance.dismiss();//关闭窗口
                                        };
                                        scope.btn_cancel = function () {
                                            $uibModalInstance.dismiss();
                                            return;
                                        };
                                    }]
                                });
                            }
                        } else {
                            menu = {items: {"delete": {name: "删除节点", icon: "delete"}}};
                        }
                        menu.items.delete.callback = function () {
                            var modalInstance = $uibModal.open({
                                templateUrl: 'confirm.html',
                                size: "sm",
                                controller: ["$scope", "$uibModalInstance", function (scope, $uibModalInstance) {
                                    scope.confirmContent = "确定删除该节点？";
                                    scope.btn_ok = function () {
                                        $scope.instance.remove(trigger.context.id);//删除节点和连线
                                        for (var i = $scope.taskSummaryList.length - 1; i >= 0; i--) {
                                            if ($scope.taskSummaryList[i].nodeType == 'LABEL') {
                                                if (trigger.context.id == $scope.taskSummaryList[i].sourceId || trigger.context.id == $scope.taskSummaryList[i].targetId) {
                                                    $scope.instance.remove($scope.taskSummaryList[i].defineId);
                                                    $scope.taskSummaryList.splice(i, 1);
                                                }
                                            } else {
                                                if (trigger.context.id == $scope.taskSummaryList[i].defineId) {
                                                    $scope.taskSummaryList.splice(i, 1);
                                                }
                                            }
                                        }
                                        ;
                                        $uibModalInstance.dismiss();//关闭窗口
                                    };
                                    scope.btn_cancel = function () {
                                        $uibModalInstance.dismiss();
                                        return;
                                    };
                                }]
                            });
                        };
                        return menu;
                    }
                });
                $.contextMenu({
                    selector: '.LabelDom',
                    build: function (trigger) {
                        menu = {items: {"delete": {name: "删除连线", icon: "delete"}}};
                        menu.items.delete.callback = function () {
                            var modalInstance = $uibModal.open({
                                templateUrl: 'confirm.html',
                                size: "sm",
                                controller: ["$scope", "$uibModalInstance", function (scope, $uibModalInstance) {
                                    scope.confirmContent = "确定删除该连线？";
                                    var conn = $scope.instance.getAllConnections();
                                    scope.btn_ok = function () {
                                        $scope.instance.remove(trigger.context.id);//删除节点和连线
                                        for (var i = 0; i < $scope.taskSummaryList.length; i++) {
                                            if (trigger.context.id == $scope.taskSummaryList[i].defineId) {
                                                for (var j = 0; j < conn.length; j++) {
                                                    if ($scope.taskSummaryList[i].connId && $scope.taskSummaryList[i].connId == conn[j].id) {
                                                        $scope.instance.detach(conn[j]);
                                                    }
                                                }
                                                $scope.taskSummaryList.splice(i, 1);
                                            }
                                        }
                                        $uibModalInstance.dismiss();
                                    };
                                    scope.btn_cancel = function () {
                                        $uibModalInstance.dismiss();
                                        return;
                                    };
                                }]
                            });
                        };
                        return menu;
                    }
                });
                $.contextMenu({
                    selector: '.jsplumb-connector',
                    build: function (trigger) {
                        menu = {items: {"delete": {name: "删除连线", icon: "delete"}}};
                        menu.items.delete.callback = function () {
                            var modalInstance = $uibModal.open({
                                templateUrl: 'confirm.html',
                                size: "sm",
                                controller: ["$scope", "$uibModalInstance", function (scope, $uibModalInstance) {
                                    scope.confirmContent = "确定删除该连线？";
                                    var conn = $scope.instance.getAllConnections();
                                    var labelId;
                                    if ($('#' + $scope.contextmenuCoon.sourceId).attr('category') == 'label') {
                                        labelId = $scope.contextmenuCoon.sourceId;
                                    } else {
                                        labelId = $scope.contextmenuCoon.targetId;
                                    }
                                    scope.btn_ok = function () {
                                        $scope.instance.remove(labelId);//删除节点和连线
                                        for (var i = 0; i < $scope.taskSummaryList.length; i++) {
                                            if (labelId == $scope.taskSummaryList[i].defineId) {
                                                for (var j = 0; j < conn.length; j++) {
                                                    if ($scope.taskSummaryList[i].connId && $scope.taskSummaryList[i].connId == conn[j].id) {
                                                        $scope.instance.detach(conn[j]);
                                                    }
                                                }
                                                $scope.taskSummaryList.splice(i, 1);
                                            }
                                        }
                                        $uibModalInstance.dismiss();
                                    };
                                    scope.btn_cancel = function () {
                                        $uibModalInstance.dismiss();
                                        return;
                                    };
                                }]
                            });
                        };
                        return menu;
                    }
                });
            };

            $scope.saveWorkflow = function () {
                console.log($scope.model)
            };

            //提交函数
            $scope.submitWorkflow = function () {
                $scope.startNode = false;
                $scope.endNode = false;
                $scope.startNodeId = [];
                $scope.fromNodeStartId = [];
                 if ($scope.taskSummaryList.length && $scope.instance) {
                        for (var i = 0; i < $scope.taskSummaryList.length; i++) {
                            var data = $scope.taskSummaryList[i];
                            $scope.flagTask = false;
                            if (!$scope.startNode && data.nodeType === 'START') {
                                if (!$scope.instance.getConnections({source: data.defineId}).length) {
                                    alert('开始节点未连线！');
                                    return;
                                }
                                $scope.startNode = true;
                                $scope.startNodeId.push(data.defineId)
                            }
                            if (!$scope.endNode && data.nodeType === 'END') {
                                if (!$scope.instance.getConnections({target: data.defineId}).length) {
                                    alert('结束节点未连线！');
                                    return;
                                }
                                $scope.endNode = true;
                            }
                            if (data.nodeType === 'TASK') {
                                if (!$scope.instance.getConnections({target: data.defineId}).length || !$scope.instance.getConnections({source: data.defineId}).length) {
                                    alert('任务节点连线不完整！');
                                    $scope.flagTask = true;
                                    return;
                                }
                                if (!data.name) {
                                    alert('任务节点信息填写不完整！');
                                    $scope.flagTask = true;
                                    return;
                                }
                            }
                        }
                        if (!$scope.startNode) {
                            alert( '请添加开始节点！');
                            return;
                        }
                        if (!$scope.endNode) {
                            alert('请添加结束节点！');
                            return;
                        }
                        if (!$scope.flagTask && $scope.endNode && $scope.startNode) {
                            var conn = $scope.instance.getAllConnections();
                            $scope.model.routers = [];
                            for (var i = 0; i < conn.length; i++) {//存储连接关系数据
                                $scope.flagLabel = false;
                                if ($('#' + conn[i].sourceId).attr('category') != 'label' && $('#' + conn[i].targetId).attr('category') != 'label') {
                                    angular.forEach($scope.labelList, function (item) {
                                        if (item.connId && item.connId == conn[i].id) {
                                            $scope.model.routers.push({
                                                fromNodeDefineId: conn[i].sourceId,
                                                toNodeDefineId: conn[i].targetId,
                                                name: conn[i].getLabel(),
                                                conditionString: '',
                                                postFrom: conn[i].postFrom,
                                                location: {
                                                    top: $('#' + item.defineId).position().top,
                                                    left: $('#' + item.defineId).position().left
                                                }
                                            });
                                        }
                                        angular.forEach($scope.startNodeId, function (id) {
                                            if (id === conn[i].sourceId) {
                                                $scope.fromNodeStartId.push(conn[i].targetId)
                                            }
                                        })
                                    });
                                }
                                //后台要求，线上文字为必填
                                if (!conn[i].getLabel()) {
                                    alert('连线名称填写不完整！');
                                    $scope.flagLabel = true;
                                    return;
                                }
                            }
                            if (!$scope.flagLabel) {
                                for (var i = $scope.taskSummaryList.length - 1; i >= 0; i--) {
                                    $scope.taskSummaryList[i].location.top = $('#' + $scope.taskSummaryList[i].defineId).position().top;
                                    $scope.taskSummaryList[i].location.left = $('#' + $scope.taskSummaryList[i].defineId).position().left;
                                    if ($scope.taskSummaryList[i].nodeType === 'LABEL') {
                                        $scope.taskSummaryList.splice(i, 1)
                                    }
                                    ;
                                };
                                $scope.model.nodes = $scope.taskSummaryList;
                                //如果修改流程图，则同时保存表单数据和流程图数据
                                $scope.saveWorkflow();
                            }
                        }
                    } else {
                        alert("请定义流程！");
                    }
            };

             //初始化数据
            $scope.taskSummaryList = [];
            $scope.routerList = [];
            $scope.jsPlumbInit();
            $scope._initConnection();
            $scope._configContextMenu();

}]).directive('repeatFinish', function ($timeout) {
    return {
        restrict: 'A',
        link: function (scope, element, attr) {
            if (scope.$last == true) {
                $timeout(function () {
                    scope.$eval(scope.repeatFinish);
                })
            }
        }
    }
});
