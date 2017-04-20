'use strict';
var editor = angular.module('editor', ['ui.bootstrap', 'FBAngular', 'ui.slider']);

'use strict';

editor
  .factory('Modal', function ($rootScope, $uibModal) {

    // Public API here
    return {
      openImportDialog: function (header, body) {
        var modalInstance = $uibModal.open({
          templateUrl: 'components/modal/modal-import.html',
          controller: ['$scope', '$uibModalInstance', function ($scope, $uibModalInstance) {
            $scope.header = header;
            $scope.body = body;
            $scope.ok = function () {
              $uibModalInstance.close('OK');
            };

          }],
        });
        return modalInstance.result;
      },
      createNewFile: function (newFile) {
        var modalInstance = $uibModal.open({
          templateUrl: 'components/modal/modal-new.html',
          backdrop: 'static',
          controller: ['$scope', '$uibModalInstance', function ($scope, $uibModalInstance) {

            $scope.newFile = newFile;
            $scope.ok = function () {
              $uibModalInstance.close('Import');
            };

            $scope.cancel = function () {
              $uibModalInstance.close('New');
            };

          }],
        });
        return modalInstance.result;
      },
      openWarningDialog: function (body) {
        var modalInstance = $uibModal.open({
          templateUrl: 'components/modal/modal-warning.html',
          controller: ['$scope', '$uibModalInstance', function ($scope, $uibModalInstance) {

            $scope.body = body;

            $scope.ok = function () {
              $uibModalInstance.close('OK');
            };

            $scope.cancel = function () {
              $uibModalInstance.dismiss('cancel');
            };

          }],
        });
        return modalInstance.result;
      },
      openExportDialog: function () {
        var modalInstance = $uibModal.open({
          templateUrl: 'components/modal/modal-export.html',
          controller: ['$scope', '$uibModalInstance', function ($scope, $uibModalInstance) {

            $scope.ok = function () {
              $uibModalInstance.close('OK');
            };

            $scope.cancel = function () {
              $uibModalInstance.dismiss('cancel');
            };

          }],
        });
        return modalInstance.result;
      }
    };
  });


editor.controller('editorCtrl', function ($scope, Modal) {
  $scope.myText = 'WebGL Terrain editing demonstration.';
  $scope.rotCursor = false;
  $scope.variables = {
    rotation: 0,
    radius: 5,
    waterLevel: -2
  }

  $scope.slider = {
    'options': {
      start: function (event, ui) { $log.info('Slider start'); },
      stop: function (event, ui) { $log.info('Slider stop'); }
    }
  }
  $scope.selectedTool = {
    hill: true,
    valley: false
  }

  $scope.sideToolbarActive = {
    Terrain: true,
    Textures: false,
    Objects: false
  }

  $scope.sideMenuActive = {
    Terrain: true,
    Textures: true,
    Objects: true
  }

  $scope.objectImages = [
    {
      src: 'objects/stone1_300x300.gif',
      name: 'Double Stone'
    },
    {
      src: 'objects/stone2_300x300.gif',
      name: 'Big Stone'
    },
    {
      src: 'objects/stone3_300x300.gif',
      name: 'Small Stone'
    },
    {
      src: 'objects/tree1_300x300.gif',
      name: 'Spruce'
    },
    {
      src: 'objects/tree2_300x300.gif',
      name: 'Oak'
    },
    {
      src: 'objects/tree3_300x300.gif',
      name: 'Abies'
    },
    {
      src: 'objects/tree4_300x300.gif',
      name: 'A strange tree'
    },
    {
      src: 'objects/tree5_300x300.gif',
      name: 'Palm'
    },
    {
      src: 'objects/tree6_300x300.gif',
      name: 'Cactus'
    }
  ]

  $scope.textures = [
    {
      name: 'Snow',
      value: 'textures/texture_ground_snow.jpg'
    },
    {
      name: 'Grass',
      value: 'textures/texture_ground_grass.jpg'
    },
    {
      name: 'Bare',
      value: 'textures/texture_ground_bare.jpg',
    },
    {
      name: 'Paper',
      value: 'textures/texture_ground_paper.jpg'
    }
  ];

  $scope.texture = {
    lower: 'textures/texture_ground_grass.jpg',
    middle: 'textures/texture_ground_bare.jpg',
    upper: 'textures/texture_ground_snow.jpg'
  }

  $scope.sideMenu = [
    'Terrain', 'Objects', 'Textures'
  ];
  $scope.setWaterLevel = function () {
    Math.floor($scope.variables.waterLevel);
    landscape.setWaterLevel($scope.variables.waterLevel);
  };

  $scope.setTexture = function (which) {
    console.log($scope.texture[which]);
    landscape.changeTexture[which]($scope.texture[which]);
  };


  $scope.selectTool = function (item) {
    $scope.selectedTool.hill = false;
    $scope.selectedTool.valley = false;
    $scope.selectedTool[item] = true;

    landscape.select(item);
  };

  $scope.setRadius = function () {
    landscape.setCircleRadius($scope.variables.radius);
  };

  $scope.onDrag = function (value) {
    $scope.rotCursor = true;
    landscape.setRotation(-value);
    $scope.variables.rotation = -value;
  };

  $scope.normalCursor = function () {
    console.log('mouseup');
    $scope.rotCursor = false;
  };

  $scope.toggleItem = function (name) {
    var index = $scope.sideMenu.indexOf(name);
    if (index > -1) {
      $scope.sideMenu.splice(index, 1);
      $scope.sideMenuActive[name] = false;
      $scope.sideToolbarActive[name] = false;
    } else {
      $scope.sideMenu.push(name);
      $scope.sideMenuActive[name] = true;
      for (var key in $scope.sideToolbarActive) {
        $scope.sideToolbarActive[key] = false;
      }
      $scope.sideToolbarActive[name] = true;
    }
  }

  $scope.togglePanel = function (item) {
    for (var key in $scope.sideToolbarActive) {
      $scope.sideToolbarActive[key] = false;
    }
    $scope.sideToolbarActive[item] = true;
  }

  $scope.openImportDialog = function (type) {
    var header = '';
    var body = '';

    if (type === 'texture') {
      header = 'Import custom texture';
      body = 'Please upload your custom texture from local drive. Allowed formats are .jpg, .png, and .gif.';
    } else {
      header = 'Import custom object';
      body = 'Please upload your custom object from local drive. Allowed formats are .jpg, .png, and .gif.';
    }

    Modal.openImportDialog(header, body);
  }

  $scope.createNew = function () {
    var text = 'If you continue, all your unsaved work will be lost. Do you wish to proceed?';
    Modal.openWarningDialog(text).then(function () {
      Modal.createNewFile(true).then(function () {
        location.reload();
      })
    })
  }

  $scope.openNew = function () {
    var text = 'If you continue, all your unsaved work will be lost. Do you wish to proceed?';
    Modal.openWarningDialog(text).then(function () {
      Modal.createNewFile(false).then(function () {
        location.reload();
      })
    })
  }

  $scope.exportFile = function () {
    Modal.openExportDialog();
  }

  $scope.$watch('variables.waterLevel', function (val1, val2) {
    if (val1 != val2) {
      $scope.setWaterLevel();
    }
  })

  $scope.$watch('variables.radius', function (val1, val2) {
    if (val1 != val2) {
      $scope.setRadius();
    }
  });
})

