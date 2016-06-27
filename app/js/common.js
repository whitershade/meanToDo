/* eslint max-len: ["error", 200] */
/* eslint-env browser */
/* eslint no-unused-expressions: ["error", { "allowShortCircuit": true, "allowTernary": true }] */
/* global angular */

(function () {
  'use strict';
  angular.module('toDoList', ['tc.chartjs']) // инициализируем angular-приложение
    .value('appValues', {
      hideToggle: false, // скрывать / показывать сделанные задачи
      inBasket: false, // показывать / скрывать удаленные задачи
      statistic: false, // показывать / скрывать статистику
      tasks: [ // массив для хранения задач
        //    { description: '1', deleted: false, done: false, hide: false, onchange: false } --> так выглядит объект типа "задача", хранящийся в массиве
      ],
      userId: ''
    }) // глобальные переменные
    /* Контроллер для инициализации глобальных переменных приложения */
    .controller('MainController', ['saveFactory', 'appValues', '$scope', function (saveFactory, appValues, $scope) {
      saveFactory.loadFromLocalStorage();
      appValues.userId = window.appinit.id + '';
    }])
    /* сервис для сохранения и загрузки данных в/из local storage, 
    также при каждой манипуляции посылает broadcast о том, что было совершено изменение в tasks */
    .service('saveFactory', ['$http', 'appValues', 'TasksChanged', function ($http, appValues, tasksChanged) {
      // сохраняем всё в local storage
      this.tasksChangedBroadcast = function () {
          // посылает broadcast о том, что было совершено изменение в tasks
          tasksChanged.broadcast();
        }
        // загружаем все данные из local storage 
      this.loadFromLocalStorage = function () {
          // посылает broadcast о том, что было совершено изменение в tasks
          this.loadTasksFromMD();
          tasksChanged.broadcast();
        }
        // вспомогательная функция, получает на вход строку с именем ключа в local storage, возвращает true или false
      this.addNewTaskInMD = function () {
        $http.post('/api/todos', JSON.stringify(appValues.tasks[appValues.tasks.length - 1]))
          .success(function (data) { // clear the form so our user is ready to enter another
            console.log(data);
            var newValue = data;
            newValue.forEach(function (item) {
              item.done = (item.done === 'true' ? true : false);
              item.deleted = (item.deleted === 'true' ? true : false);
              item.hide = (item.hide === 'true' ? true : false);
              item.onchange = false;
            })
            appValues.tasks = newValue;
          })
          .error(function (data) {
            console.log('Error: ' + data);
          });
      }
      this.loadTasksFromMD = function () {
        $http.get('/api/todos')
          .success(function (data) {
            var newValue = data;
            console.log(newValue);
            newValue.forEach(function (item) {
              item.done = (item.done === 'true' ? true : false);
              item.deleted = (item.deleted === 'true' ? true : false);
              item.hide = (item.deleted ? true : false);
              item.onchange = false;
            })
            appValues.tasks.splice(0, appValues.tasks.length);
            newValue.forEach(function (item) {
              if (item.id === appValues.userId) {
                appValues.tasks.push(item);
              }
            });
            tasksChanged.broadcast();
            console.log("load from database");
            console.log(appValues.tasks);
          })
          .error(function (data) {
            console.log('Error: ' + data);
          });
      }
      this.deleteTaskFromMD = function (id) {
        $http.delete('/api/todos/' + id)
          .success(function (data) {
            console.log(data);
          })
          .error(function (data) {
            console.log('Error: ' + data);
          });
      }
      this.changeTaskInMD = function (id, index) {
        $http.put('/api/todos/' + id, JSON.stringify(appValues.tasks[index]))
          .success(function (data) {
            console.log(data);
          })
          .error(function (data) {
            console.log('Error: ' + data);
          });
      }
      this.getBool = function (property) {
        let value = localStorage.getItem(property); // пытаемся считать значение Local Storage
        if (!value) return false; // по умолчанию зададим ему false (значит, на него ещё не нажимали)
        return value === 'true' ? true : false; // если записана строка 'true', то преобразуем её в bool true, иначе в bool false
      }
  }])
    /* сервис, функция broadcast которого апускает извещение о том, что в tasks было произведено изменение */
    .service('TasksChanged', ['$rootScope', function ($rootScope) {
      this.broadcast = function () {
        $rootScope.$broadcast('TasksChanged');
      };
    }])
    /* Директива для вывода текущей даты */
    .directive('currentDate', function () {
      return {
        restrict: 'E', // only matches element name
        templateUrl: 'current-date.html', // где хранится html
        controller: function () { // задаем контроллер
          this.date = new Date(); // получаем текущую дату
        },
        controllerAs: 'dateCtrl' // устанавливаем псевдоним для контроллера
      };
    })
    /* Директива для кнопок упрвления */
    .directive('controlButtons', ['saveFactory', 'appValues', function (saveFactory, appValues) {
      return {
        restrict: 'E', // only matches element name
        templateUrl: 'control-buttons.html', // где хранится html
        controller: function () { // задаем контроллер
          this.inBasket = appValues.inBasket; // задаем текущее значение inBasket
          this.hideToggle = appValues.hideToggle; // задаем текущее значение hideToggle
          this.addNewTask = function (descr) { // добавляем новую задачу, на вход подается содержаение задачи
            appValues.tasks.push({ // в массив задач добавляется новый объект с
              id: appValues.userId,
              description: descr || '', //полученным при вызове функции описанием
              deleted: false, // задача не удалена
              done: false, // не выполнена
              hide: false, // не скрыта
              onchange: false // не изменяется в текущий момент
            });
            console.log(appValues.tasks);
            saveFactory.addNewTaskInMD();
            saveFactory.tasksChangedBroadcast(); // сохранить изменения в local storage
          };
          this.toggleDone = function () { // функция для переключения done/undone задачи
            this.hideToggle = appValues.hideToggle = !appValues.hideToggle; // переключаем done/undone, глобальную и внутри котроллера
            appValues.tasks.forEach(function (item) { // для каждой задачи
              item.done && appValues.hideToggle && (item.hide = true); // если задача сделана, и выбрано скрывать сделанные задачи, то скрываем
              item.done && !appValues.hideToggle && (item.hide = false); // есил задача сделана, и выбрано показывать сделанные задачи, то показываем
            });
            saveFactory.tasksChangedBroadcast(); // сохранить изменения в local storage 
          };
          this.toggleDeletedTasks = function () {
            this.inBasket = appValues.inBasket = !appValues.inBasket; // переключаем в корзине/не в корзине, глобальную и внутри котроллера
            appValues.tasks.forEach(function (item, i) { // для каждой задачи
              item.hide = true; // скрываем каждую задачу
              appValues.inBasket && item.deleted && (item.hide = false); // если в данный момент пользователь находится в корзине, и задача удалена, то показываем задачу
              !appValues.inBasket && !item.deleted && (item.hide = false); // если пользователь не находится в корзине, и задача не удалена, то показываем её
              !appValues.inBasket && appValues.hideToggle && item.done && (item.hide = true); // если пользователь не в корзине, неоходимо скрывать сделанные задачи, а задача сделана, то скрываем её
            });
            saveFactory.tasksChangedBroadcast();
          };
        },
        controllerAs: 'btnCtrl' // псевдоним для контроллера
      };
  }])
    /* Директива для списка задач */
    .directive('tasksList', ['saveFactory', 'appValues', function (saveFactory, appValues) {
      return {
        restrict: 'E', // only matches element name
        templateUrl: 'tasks-list.html', // где хранится html
        controller: function () {
          this.returnIdIndex = function (task) {
            let id;
            let index;
            let i = appValues.tasks.length - 1; // переменная для хранения длины массива -1
            while (i >= 0) { // пока в массиве ещё есть элементы
              if (appValues.tasks[i].$$hashKey === task.$$hashKey) { // если hashKey элемента равен haskKey удаляемой задачи
                id = appValues.tasks[i]._id; // то сохраняем индекс задачи в массиве
                index = i;
                break; // прекращаем выполнение цикла
              }
              i--; // делаем следующий шаг
            }
            return {
              id: id,
              index: index
            }
          }
          this.tasks = appValues.tasks; // получаем список задач
          this.changeTask = function (task, description) { // функция для изменения текущего содержания задачи
            task.onchange = !task.onchange; // переключаем onchange для задачи
            description && (task.description = description); // если в функцию передано содеражаение для записи в задачу, то записываем его
            saveFactory.tasksChangedBroadcast(); // сохраняем изменения в local storage
            let idIndex = this.returnIdIndex(task);
            saveFactory.changeTaskInMD(idIndex.id, idIndex.index);
          };
          this.toggleDone = function (task) { // функция для изменения done/undone задачи
            task.done = !task.done; // переключаем done/undone для задачи
            appValues.hideToggle && (task.hide = true); // если выбрано скрывать сделанные задачи, то скрываем только что отмеченную задачу// переменная для хранения индекса
            let idIndex = this.returnIdIndex(task);
            saveFactory.changeTaskInMD(idIndex.id, idIndex.index);
            saveFactory.tasksChangedBroadcast();
          };
          this.deleteTask = function (task) { // функция для перемещения задачи в корзину
            task.deleted = true; // задача является удаленной
            task.hide = true; // скрытой
            task.done = false; // и не выполненной
            let idIndex = this.returnIdIndex(task);
            saveFactory.changeTaskInMD(idIndex.id, idIndex.index);
            saveFactory.tasksChangedBroadcast();
          };
          this.returnTask = function (task) { // функция для возвращени задачи из корзины
            task.deleted = false; // задача является не удаленной
            task.hide = true; // скрываем её из корзины
            let idIndex = this.returnIdIndex(task);
            saveFactory.changeTaskInMD(idIndex.id, idIndex.index);
            saveFactory.tasksChangedBroadcast();
          };
          this.finallyDeleteTask = function (task) { // функция для окончательного удаления задачи
            if (confirm('Точно удалить задачу?')) { // запрос пользователю точно ли он хочет удалить задачу, если да, то переходим к удалению
              let idIndex = this.returnIdIndex(task);
              appValues.tasks.splice(idIndex.index, 1); // удаляем задачу из массива задач
              saveFactory.deleteTaskFromMD(idIndex.id);
              saveFactory.tasksChangedBroadcast();
            }
          };
        },
        controllerAs: 'taskCtrl' // устанавливаем псевдоним для контроллера
      };
  }])
    /* Контроллер для pie статистики */
    .controller('PieCtrl', ['$scope', '$rootScope', 'appValues', 'saveFactory', function ($scope, $rootScope, appValues, saveFactory) {
      // инициализируем стартовые значения
      $scope.showCanvas = appValues.statistic; // cкрываем / показываем canvas c pie statistic
      $scope.hideShowButtonContent = $scope.showCanvas === false ? 'show statistics' : 'hide statistics'; // получаем содержание для button
      $scope.pieTaskkButtonHide = (appValues.tasks.length > 0) ? false : true; // если нет задач, то не показываем button
      // при клике на button
      $scope.showHideClick = function () {
        appValues.statistic = $scope.showCanvas = !$scope.showCanvas; // тогглим значение для appValues.statistic
        $scope.hideShowButtonContent = $scope.showCanvas === false ? 'show statistics' : 'hide statistics'; // меняем содержание для button
        saveFactory.tasksChangedBroadcast();
      };
      // если пришло оповещение о том, что в tasks произошли изменения
      $rootScope.$on('TasksChanged', function () { // функция обновления статистики
        // переменные для хранения задач:
        let doneTasks = 0; // выполненных
        let deletedTasks = 0; // удаленных
        let undoneTasks = 0; // ещё не сделанных
        if (appValues.tasks.length === 0) { // если нет задач
          appValues.statistic = false; // меняем значение в appValues
          $scope.hideShowButtonContent = 'show statistics'; // меняем значение контента для button
        }
        $scope.pieTaskkButtonHide = (appValues.tasks.length > 0) ? false : true; // если нет задач, то не показываем button
        $scope.showCanvas = !$scope.pieTaskkButtonHide && appValues.statistic;
        appValues.tasks.forEach(function (item) { // считаем количество различных задач в списке задач
          item.done && (doneTasks += 1); // если задача сделана, то увеличиваем количество сделанных задач
          item.deleted && (deletedTasks += 1); // если задача удалена, то увеличиваем количество удаленных задач
          !item.deleted && !item.done && (undoneTasks += 1); // если задача не сделана, и не удалена, то увеичиваем количество ещё не сделанных задач
        });
        // задаем значения для pie statistic
        $scope.data = {
          datasets: [{
            label: "My dataset",
            data: [
          deletedTasks,
          doneTasks,
          undoneTasks
        ],
            backgroundColor: [
          "#F7464A",
          "#46BFBD",
          "#FDB45C"
        ]
      }],
          labels: [
        "Deleted tasks",
        "Done tasks",
        "Undone tasks"
      ]
        };
        // задаем настройки для pie statistic
        $scope.options = {
          legend: {
            display: true
          },
          legendCallback: function (chart) {
            var text = [];
            for (var i = 0; i < chart.data.datasets.length; i++) {
              var dataset = chart.data.datasets[i];
              text.push('');
              for (var j = 0; j < dataset.data.length; j++) {
                text.push('');
                text.push(chart.data.labels[j]);
                text.push('');
              }
              text.push('');
            }
            return text.join("");
          },
          responsive: true
        };
      });
    }])
}());