'use strict';

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
    tasks: [// массив для хранения задач
      //    { description: '1', deleted: false, done: false, hide: false, onchange: false } --> так выглядит объект типа "задача", хранящийся в массиве
    ]
  }) // глобальные переменные
  /* Контроллер для инициализации глобальных переменных приложения */
  .controller('MainController', ['saveFactory', function (saveFactory) {
    saveFactory.loadFromLocalStorage();
  }])
  /* сервис для сохранения и загрузки данных в/из local storage, 
  также при каждой манипуляции посылает broadcast о том, что было совершено изменение в tasks */
  .service('saveFactory', ['$http', 'appValues', 'TasksChanged', function ($http, appValues, tasksChanged) {
    // сохраняем всё в local storage
    this.tasksChangedBroadcast = function () {
      // посылает broadcast о том, что было совершено изменение в tasks
      tasksChanged.broadcast();
    };
    // загружаем все данные из local storage
    this.loadFromLocalStorage = function () {
      // посылает broadcast о том, что было совершено изменение в tasks
      this.loadTasksFromMD();
      tasksChanged.broadcast();
    };
    // вспомогательная функция, получает на вход строку с именем ключа в local storage, возвращает true или false
    this.addNewTaskInMD = function () {
      $http.post('/api/todos', JSON.stringify(appValues.tasks[appValues.tasks.length - 1])).success(function (data) {
        // clear the form so our user is ready to enter another
        console.log(data);
        var newValue = data;
        newValue.forEach(function (item) {
          item.done = item.done === 'true' ? true : false;
          item.deleted = item.deleted === 'true' ? true : false;
          item.hide = item.hide === 'true' ? true : false;
          item.onchange = false;
        });
        appValues.tasks = newValue;
      }).error(function (data) {
        console.log('Error: ' + data);
      });
    };
    this.loadTasksFromMD = function () {
      $http.get('/api/todos').success(function (data) {
        var newValue = data;
        console.log(newValue);
        newValue.forEach(function (item) {
          item.done = item.done === 'true' ? true : false;
          item.deleted = item.deleted === 'true' ? true : false;
          item.hide = item.deleted ? true : false;
          item.onchange = false;
        });
        appValues.tasks.splice(0, appValues.tasks.length);
        newValue.forEach(function (item) {
          appValues.tasks.push(item);
        });
        tasksChanged.broadcast();
        console.log("load from database");
        console.log(appValues.tasks);
      }).error(function (data) {
        console.log('Error: ' + data);
      });
    };
    this.deleteTaskFromMD = function (id) {
      $http.delete('/api/todos/' + id).success(function (data) {
        console.log(data);
      }).error(function (data) {
        console.log('Error: ' + data);
      });
    };
    this.changeTaskInMD = function (id, index) {
      $http.put('/api/todos/' + id, JSON.stringify(appValues.tasks[index])).success(function (data) {
        console.log(data);
      }).error(function (data) {
        console.log('Error: ' + data);
      });
    };
    this.getBool = function (property) {
      var value = localStorage.getItem(property); // пытаемся считать значение Local Storage
      if (!value) return false; // по умолчанию зададим ему false (значит, на него ещё не нажимали)
      return value === 'true' ? true : false; // если записана строка 'true', то преобразуем её в bool true, иначе в bool false
    };
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
      controller: function controller() {
        // задаем контроллер
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
      controller: function controller() {
        // задаем контроллер
        this.inBasket = appValues.inBasket; // задаем текущее значение inBasket
        this.hideToggle = appValues.hideToggle; // задаем текущее значение hideToggle
        this.addNewTask = function (descr) {
          // добавляем новую задачу, на вход подается содержаение задачи
          appValues.tasks.push({ // в массив задач добавляется новый объект с
            description: descr || '', //полученным при вызове функции описанием
            deleted: false, // задача не удалена
            done: false, // не выполнена
            hide: false, // не скрыта
            onchange: false // не изменяется в текущий момент
          });
          saveFactory.addNewTaskInMD();
          saveFactory.tasksChangedBroadcast(); // сохранить изменения в local storage
        };
        this.toggleDone = function () {
          // функция для переключения done/undone задачи
          this.hideToggle = appValues.hideToggle = !appValues.hideToggle; // переключаем done/undone, глобальную и внутри котроллера
          appValues.tasks.forEach(function (item) {
            // для каждой задачи
            item.done && appValues.hideToggle && (item.hide = true); // если задача сделана, и выбрано скрывать сделанные задачи, то скрываем
            item.done && !appValues.hideToggle && (item.hide = false); // есил задача сделана, и выбрано показывать сделанные задачи, то показываем
          });
          saveFactory.tasksChangedBroadcast(); // сохранить изменения в local storage
        };
        this.toggleDeletedTasks = function () {
          this.inBasket = appValues.inBasket = !appValues.inBasket; // переключаем в корзине/не в корзине, глобальную и внутри котроллера
          appValues.tasks.forEach(function (item, i) {
            // для каждой задачи
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
      controller: function controller() {
        this.returnIdIndex = function (task) {
          var id = void 0;
          var index = void 0;
          var i = appValues.tasks.length - 1; // переменная для хранения длины массива -1
          while (i >= 0) {
            // пока в массиве ещё есть элементы
            if (appValues.tasks[i].$$hashKey === task.$$hashKey) {
              // если hashKey элемента равен haskKey удаляемой задачи
              id = appValues.tasks[i]._id; // то сохраняем индекс задачи в массиве
              index = i;
              break; // прекращаем выполнение цикла
            }
            i--; // делаем следующий шаг
          }
          return {
            id: id,
            index: index
          };
        };
        this.tasks = appValues.tasks; // получаем список задач
        this.changeTask = function (task, description) {
          // функция для изменения текущего содержания задачи
          task.onchange = !task.onchange; // переключаем onchange для задачи
          description && (task.description = description); // если в функцию передано содеражаение для записи в задачу, то записываем его
          saveFactory.tasksChangedBroadcast(); // сохраняем изменения в local storage
          var idIndex = this.returnIdIndex(task);
          saveFactory.changeTaskInMD(idIndex.id, idIndex.index);
        };
        this.toggleDone = function (task) {
          // функция для изменения done/undone задачи
          task.done = !task.done; // переключаем done/undone для задачи
          appValues.hideToggle && (task.hide = true); // если выбрано скрывать сделанные задачи, то скрываем только что отмеченную задачу// переменная для хранения индекса
          var idIndex = this.returnIdIndex(task);
          saveFactory.changeTaskInMD(idIndex.id, idIndex.index);
          saveFactory.tasksChangedBroadcast();
        };
        this.deleteTask = function (task) {
          // функция для перемещения задачи в корзину
          task.deleted = true; // задача является удаленной
          task.hide = true; // скрытой
          task.done = false; // и не выполненной
          var idIndex = this.returnIdIndex(task);
          saveFactory.changeTaskInMD(idIndex.id, idIndex.index);
          saveFactory.tasksChangedBroadcast();
        };
        this.returnTask = function (task) {
          // функция для возвращени задачи из корзины
          task.deleted = false; // задача является не удаленной
          task.hide = true; // скрываем её из корзины
          var idIndex = this.returnIdIndex(task);
          saveFactory.changeTaskInMD(idIndex.id, idIndex.index);
          saveFactory.tasksChangedBroadcast();
        };
        this.finallyDeleteTask = function (task) {
          // функция для окончательного удаления задачи
          if (confirm('Точно удалить задачу?')) {
            // запрос пользователю точно ли он хочет удалить задачу, если да, то переходим к удалению
            var idIndex = this.returnIdIndex(task);
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
    $scope.pieTaskkButtonHide = appValues.tasks.length > 0 ? false : true; // если нет задач, то не показываем button
    // при клике на button
    $scope.showHideClick = function () {
      appValues.statistic = $scope.showCanvas = !$scope.showCanvas; // тогглим значение для appValues.statistic
      $scope.hideShowButtonContent = $scope.showCanvas === false ? 'show statistics' : 'hide statistics'; // меняем содержание для button
      saveFactory.tasksChangedBroadcast();
    };
    // если пришло оповещение о том, что в tasks произошли изменения
    $rootScope.$on('TasksChanged', function () {
      // функция обновления статистики
      // переменные для хранения задач:
      var doneTasks = 0; // выполненных
      var deletedTasks = 0; // удаленных
      var undoneTasks = 0; // ещё не сделанных
      if (appValues.tasks.length === 0) {
        // если нет задач
        appValues.statistic = false; // меняем значение в appValues
        $scope.hideShowButtonContent = 'show statistics'; // меняем значение контента для button
      }
      $scope.pieTaskkButtonHide = appValues.tasks.length > 0 ? false : true; // если нет задач, то не показываем button
      $scope.showCanvas = !$scope.pieTaskkButtonHide && appValues.statistic;
      appValues.tasks.forEach(function (item) {
        // считаем количество различных задач в списке задач
        item.done && (doneTasks += 1); // если задача сделана, то увеличиваем количество сделанных задач
        item.deleted && (deletedTasks += 1); // если задача удалена, то увеличиваем количество удаленных задач
        !item.deleted && !item.done && (undoneTasks += 1); // если задача не сделана, и не удалена, то увеичиваем количество ещё не сделанных задач
      });
      // задаем значения для pie statistic
      $scope.data = {
        datasets: [{
          label: "My dataset",
          data: [deletedTasks, doneTasks, undoneTasks],
          backgroundColor: ["#F7464A", "#46BFBD", "#FDB45C"]
        }],
        labels: ["Deleted tasks", "Done tasks", "Undone tasks"]
      };
      // задаем настройки для pie statistic
      $scope.options = {
        legend: {
          display: true
        },
        legendCallback: function legendCallback(chart) {
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
  }]);
})();
//# sourceMappingURL=data:application/json;base64,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LEVBR25CLFNBSG1CO0FBUFIsU0FBRCxDQURFO0FBY1osZ0JBQVEsQ0FDVixlQURVLEVBRVYsWUFGVSxFQUdWLGNBSFU7QUFkSSxPQUFkOztBQXFCQSxhQUFPLE9BQVAsR0FBaUI7QUFDZixnQkFBUTtBQUNOLG1CQUFTO0FBREgsU0FETztBQUlmLHdCQUFnQix3QkFBVSxLQUFWLEVBQWlCO0FBQy9CLGNBQUksT0FBTyxFQUFYO0FBQ0EsZUFBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLE1BQU0sSUFBTixDQUFXLFFBQVgsQ0FBb0IsTUFBeEMsRUFBZ0QsR0FBaEQsRUFBcUQ7QUFDbkQsZ0JBQUksVUFBVSxNQUFNLElBQU4sQ0FBVyxRQUFYLENBQW9CLENBQXBCLENBQWQ7QUFDQSxpQkFBSyxJQUFMLENBQVUsRUFBVjtBQUNBLGlCQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksUUFBUSxJQUFSLENBQWEsTUFBakMsRUFBeUMsR0FBekMsRUFBOEM7QUFDNUMsbUJBQUssSUFBTCxDQUFVLEVBQVY7QUFDQSxtQkFBSyxJQUFMLENBQVUsTUFBTSxJQUFOLENBQVcsTUFBWCxDQUFrQixDQUFsQixDQUFWO0FBQ0EsbUJBQUssSUFBTCxDQUFVLEVBQVY7QUFDRDtBQUNELGlCQUFLLElBQUwsQ0FBVSxFQUFWO0FBQ0Q7QUFDRCxpQkFBTyxLQUFLLElBQUwsQ0FBVSxFQUFWLENBQVA7QUFDRCxTQWpCYztBQWtCZixvQkFBWTtBQWxCRyxPQUFqQjtBQW9CRCxLQTFERDtBQTJERCxHQXZFc0IsQ0F4TnpCO0FBZ1NELENBbFNBLEdBQUQiLCJmaWxlIjoiY29tbW9uLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50IG1heC1sZW46IFtcImVycm9yXCIsIDIwMF0gKi9cbi8qIGVzbGludC1lbnYgYnJvd3NlciAqL1xuLyogZXNsaW50IG5vLXVudXNlZC1leHByZXNzaW9uczogW1wiZXJyb3JcIiwgeyBcImFsbG93U2hvcnRDaXJjdWl0XCI6IHRydWUsIFwiYWxsb3dUZXJuYXJ5XCI6IHRydWUgfV0gKi9cbi8qIGdsb2JhbCBhbmd1bGFyICovXG5cbihmdW5jdGlvbiAoKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgYW5ndWxhci5tb2R1bGUoJ3RvRG9MaXN0JywgWyd0Yy5jaGFydGpzJ10pIC8vINC40L3QuNGG0LjQsNC70LjQt9C40YDRg9C10LwgYW5ndWxhci3Qv9GA0LjQu9C+0LbQtdC90LjQtVxuICAgIC52YWx1ZSgnYXBwVmFsdWVzJywge1xuICAgICAgaGlkZVRvZ2dsZTogZmFsc2UsIC8vINGB0LrRgNGL0LLQsNGC0YwgLyDQv9C+0LrQsNC30YvQstCw0YLRjCDRgdC00LXQu9Cw0L3QvdGL0LUg0LfQsNC00LDRh9C4XG4gICAgICBpbkJhc2tldDogZmFsc2UsIC8vINC/0L7QutCw0LfRi9Cy0LDRgtGMIC8g0YHQutGA0YvQstCw0YLRjCDRg9C00LDQu9C10L3QvdGL0LUg0LfQsNC00LDRh9C4XG4gICAgICBzdGF0aXN0aWM6IGZhbHNlLCAvLyDQv9C+0LrQsNC30YvQstCw0YLRjCAvINGB0LrRgNGL0LLQsNGC0Ywg0YHRgtCw0YLQuNGB0YLQuNC60YNcbiAgICAgIHRhc2tzOiBbIC8vINC80LDRgdGB0LjQsiDQtNC70Y8g0YXRgNCw0L3QtdC90LjRjyDQt9Cw0LTQsNGHXG4gICAgICAgIC8vICAgIHsgZGVzY3JpcHRpb246ICcxJywgZGVsZXRlZDogZmFsc2UsIGRvbmU6IGZhbHNlLCBoaWRlOiBmYWxzZSwgb25jaGFuZ2U6IGZhbHNlIH0gLS0+INGC0LDQuiDQstGL0LPQu9GP0LTQuNGCINC+0LHRitC10LrRgiDRgtC40L/QsCBcItC30LDQtNCw0YfQsFwiLCDRhdGA0LDQvdGP0YnQuNC50YHRjyDQsiDQvNCw0YHRgdC40LLQtVxuICAgICAgXVxuICAgIH0pIC8vINCz0LvQvtCx0LDQu9GM0L3Ri9C1INC/0LXRgNC10LzQtdC90L3Ri9C1XG4gICAgLyog0JrQvtC90YLRgNC+0LvQu9C10YAg0LTQu9GPINC40L3QuNGG0LjQsNC70LjQt9Cw0YbQuNC4INCz0LvQvtCx0LDQu9GM0L3Ri9GFINC/0LXRgNC10LzQtdC90L3Ri9GFINC/0YDQuNC70L7QttC10L3QuNGPICovXG4gICAgLmNvbnRyb2xsZXIoJ01haW5Db250cm9sbGVyJywgWydzYXZlRmFjdG9yeScsIGZ1bmN0aW9uIChzYXZlRmFjdG9yeSkge1xuICAgICAgc2F2ZUZhY3RvcnkubG9hZEZyb21Mb2NhbFN0b3JhZ2UoKTtcbiAgICB9XSlcbiAgICAvKiDRgdC10YDQstC40YEg0LTQu9GPINGB0L7RhdGA0LDQvdC10L3QuNGPINC4INC30LDQs9GA0YPQt9C60Lgg0LTQsNC90L3Ri9GFINCyL9C40LcgbG9jYWwgc3RvcmFnZSwgXG4gICAg0YLQsNC60LbQtSDQv9GA0Lgg0LrQsNC20LTQvtC5INC80LDQvdC40L/Rg9C70Y/RhtC40Lgg0L/QvtGB0YvQu9Cw0LXRgiBicm9hZGNhc3Qg0L4g0YLQvtC8LCDRh9GC0L4g0LHRi9C70L4g0YHQvtCy0LXRgNGI0LXQvdC+INC40LfQvNC10L3QtdC90LjQtSDQsiB0YXNrcyAqL1xuICAgIC5zZXJ2aWNlKCdzYXZlRmFjdG9yeScsIFsnJGh0dHAnLCAnYXBwVmFsdWVzJywgJ1Rhc2tzQ2hhbmdlZCcsIGZ1bmN0aW9uICgkaHR0cCwgYXBwVmFsdWVzLCB0YXNrc0NoYW5nZWQpIHtcbiAgICAgIC8vINGB0L7RhdGA0LDQvdGP0LXQvCDQstGB0ZEg0LIgbG9jYWwgc3RvcmFnZVxuICAgICAgdGhpcy50YXNrc0NoYW5nZWRCcm9hZGNhc3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgLy8g0L/QvtGB0YvQu9Cw0LXRgiBicm9hZGNhc3Qg0L4g0YLQvtC8LCDRh9GC0L4g0LHRi9C70L4g0YHQvtCy0LXRgNGI0LXQvdC+INC40LfQvNC10L3QtdC90LjQtSDQsiB0YXNrc1xuICAgICAgICAgIHRhc2tzQ2hhbmdlZC5icm9hZGNhc3QoKTtcbiAgICAgICAgfVxuICAgICAgICAvLyDQt9Cw0LPRgNGD0LbQsNC10Lwg0LLRgdC1INC00LDQvdC90YvQtSDQuNC3IGxvY2FsIHN0b3JhZ2UgXG4gICAgICB0aGlzLmxvYWRGcm9tTG9jYWxTdG9yYWdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIC8vINC/0L7RgdGL0LvQsNC10YIgYnJvYWRjYXN0INC+INGC0L7QvCwg0YfRgtC+INCx0YvQu9C+INGB0L7QstC10YDRiNC10L3QviDQuNC30LzQtdC90LXQvdC40LUg0LIgdGFza3NcbiAgICAgICAgICB0aGlzLmxvYWRUYXNrc0Zyb21NRCgpO1xuICAgICAgICAgIHRhc2tzQ2hhbmdlZC5icm9hZGNhc3QoKTtcbiAgICAgICAgfVxuICAgICAgICAvLyDQstGB0L/QvtC80L7Qs9Cw0YLQtdC70YzQvdCw0Y8g0YTRg9C90LrRhtC40Y8sINC/0L7Qu9GD0YfQsNC10YIg0L3QsCDQstGF0L7QtCDRgdGC0YDQvtC60YMg0YEg0LjQvNC10L3QtdC8INC60LvRjtGH0LAg0LIgbG9jYWwgc3RvcmFnZSwg0LLQvtC30LLRgNCw0YnQsNC10YIgdHJ1ZSDQuNC70LggZmFsc2VcbiAgICAgIHRoaXMuYWRkTmV3VGFza0luTUQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICRodHRwLnBvc3QoJy9hcGkvdG9kb3MnLCBKU09OLnN0cmluZ2lmeShhcHBWYWx1ZXMudGFza3NbYXBwVmFsdWVzLnRhc2tzLmxlbmd0aCAtIDFdKSlcbiAgICAgICAgICAuc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSkgeyAvLyBjbGVhciB0aGUgZm9ybSBzbyBvdXIgdXNlciBpcyByZWFkeSB0byBlbnRlciBhbm90aGVyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgIHZhciBuZXdWYWx1ZSA9IGRhdGE7XG4gICAgICAgICAgICBuZXdWYWx1ZS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgIGl0ZW0uZG9uZSA9IChpdGVtLmRvbmUgPT09ICd0cnVlJyA/IHRydWUgOiBmYWxzZSk7XG4gICAgICAgICAgICAgIGl0ZW0uZGVsZXRlZCA9IChpdGVtLmRlbGV0ZWQgPT09ICd0cnVlJyA/IHRydWUgOiBmYWxzZSk7XG4gICAgICAgICAgICAgIGl0ZW0uaGlkZSA9IChpdGVtLmhpZGUgPT09ICd0cnVlJyA/IHRydWUgOiBmYWxzZSk7XG4gICAgICAgICAgICAgIGl0ZW0ub25jaGFuZ2UgPSBmYWxzZTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBhcHBWYWx1ZXMudGFza3MgPSBuZXdWYWx1ZTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5lcnJvcihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yOiAnICsgZGF0YSk7XG4gICAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICB0aGlzLmxvYWRUYXNrc0Zyb21NRCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJGh0dHAuZ2V0KCcvYXBpL3RvZG9zJylcbiAgICAgICAgICAuc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgdmFyIG5ld1ZhbHVlID0gZGF0YTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG5ld1ZhbHVlKTtcbiAgICAgICAgICAgIG5ld1ZhbHVlLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgaXRlbS5kb25lID0gKGl0ZW0uZG9uZSA9PT0gJ3RydWUnID8gdHJ1ZSA6IGZhbHNlKTtcbiAgICAgICAgICAgICAgaXRlbS5kZWxldGVkID0gKGl0ZW0uZGVsZXRlZCA9PT0gJ3RydWUnID8gdHJ1ZSA6IGZhbHNlKTtcbiAgICAgICAgICAgICAgaXRlbS5oaWRlID0gKGl0ZW0uZGVsZXRlZCA/IHRydWUgOiBmYWxzZSk7XG4gICAgICAgICAgICAgIGl0ZW0ub25jaGFuZ2UgPSBmYWxzZTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBhcHBWYWx1ZXMudGFza3Muc3BsaWNlKDAsIGFwcFZhbHVlcy50YXNrcy5sZW5ndGgpO1xuICAgICAgICAgICAgbmV3VmFsdWUuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICBhcHBWYWx1ZXMudGFza3MucHVzaChpdGVtKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGFza3NDaGFuZ2VkLmJyb2FkY2FzdCgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJsb2FkIGZyb20gZGF0YWJhc2VcIik7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhhcHBWYWx1ZXMudGFza3MpO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmVycm9yKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3I6ICcgKyBkYXRhKTtcbiAgICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZGVsZXRlVGFza0Zyb21NRCA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAkaHR0cC5kZWxldGUoJy9hcGkvdG9kb3MvJyArIGlkKVxuICAgICAgICAgIC5zdWNjZXNzKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5lcnJvcihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yOiAnICsgZGF0YSk7XG4gICAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICB0aGlzLmNoYW5nZVRhc2tJbk1EID0gZnVuY3Rpb24gKGlkLCBpbmRleCkge1xuICAgICAgICAkaHR0cC5wdXQoJy9hcGkvdG9kb3MvJyArIGlkLCBKU09OLnN0cmluZ2lmeShhcHBWYWx1ZXMudGFza3NbaW5kZXhdKSlcbiAgICAgICAgICAuc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuZXJyb3IoZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvcjogJyArIGRhdGEpO1xuICAgICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgdGhpcy5nZXRCb29sID0gZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgIGxldCB2YWx1ZSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKHByb3BlcnR5KTsgLy8g0L/Ri9GC0LDQtdC80YHRjyDRgdGH0LjRgtCw0YLRjCDQt9C90LDRh9C10L3QuNC1IExvY2FsIFN0b3JhZ2VcbiAgICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuIGZhbHNlOyAvLyDQv9C+INGD0LzQvtC70YfQsNC90LjRjiDQt9Cw0LTQsNC00LjQvCDQtdC80YMgZmFsc2UgKNC30L3QsNGH0LjRgiwg0L3QsCDQvdC10LPQviDQtdGJ0ZEg0L3QtSDQvdCw0LbQuNC80LDQu9C4KVxuICAgICAgICByZXR1cm4gdmFsdWUgPT09ICd0cnVlJyA/IHRydWUgOiBmYWxzZTsgLy8g0LXRgdC70Lgg0LfQsNC/0LjRgdCw0L3QsCDRgdGC0YDQvtC60LAgJ3RydWUnLCDRgtC+INC/0YDQtdC+0LHRgNCw0LfRg9C10Lwg0LXRkSDQsiBib29sIHRydWUsINC40L3QsNGH0LUg0LIgYm9vbCBmYWxzZVxuICAgICAgfVxuICB9XSlcbiAgICAvKiDRgdC10YDQstC40YEsINGE0YPQvdC60YbQuNGPIGJyb2FkY2FzdCDQutC+0YLQvtGA0L7Qs9C+INCw0L/Rg9GB0LrQsNC10YIg0LjQt9Cy0LXRidC10L3QuNC1INC+INGC0L7QvCwg0YfRgtC+INCyIHRhc2tzINCx0YvQu9C+INC/0YDQvtC40LfQstC10LTQtdC90L4g0LjQt9C80LXQvdC10L3QuNC1ICovXG4gICAgLnNlcnZpY2UoJ1Rhc2tzQ2hhbmdlZCcsIFsnJHJvb3RTY29wZScsIGZ1bmN0aW9uICgkcm9vdFNjb3BlKSB7XG4gICAgICB0aGlzLmJyb2FkY2FzdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdUYXNrc0NoYW5nZWQnKTtcbiAgICAgIH07XG4gICAgfV0pXG4gICAgLyog0JTQuNGA0LXQutGC0LjQstCwINC00LvRjyDQstGL0LLQvtC00LAg0YLQtdC60YPRidC10Lkg0LTQsNGC0YsgKi9cbiAgICAuZGlyZWN0aXZlKCdjdXJyZW50RGF0ZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsIC8vIG9ubHkgbWF0Y2hlcyBlbGVtZW50IG5hbWVcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdjdXJyZW50LWRhdGUuaHRtbCcsIC8vINCz0LTQtSDRhdGA0LDQvdC40YLRgdGPIGh0bWxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24gKCkgeyAvLyDQt9Cw0LTQsNC10Lwg0LrQvtC90YLRgNC+0LvQu9C10YBcbiAgICAgICAgICB0aGlzLmRhdGUgPSBuZXcgRGF0ZSgpOyAvLyDQv9C+0LvRg9GH0LDQtdC8INGC0LXQutGD0YnRg9GOINC00LDRgtGDXG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRyb2xsZXJBczogJ2RhdGVDdHJsJyAvLyDRg9GB0YLQsNC90LDQstC70LjQstCw0LXQvCDQv9GB0LXQstC00L7QvdC40Lwg0LTQu9GPINC60L7QvdGC0YDQvtC70LvQtdGA0LBcbiAgICAgIH07XG4gICAgfSlcbiAgICAvKiDQlNC40YDQtdC60YLQuNCy0LAg0LTQu9GPINC60L3QvtC/0L7QuiDRg9C/0YDQstC70LXQvdC40Y8gKi9cbiAgICAuZGlyZWN0aXZlKCdjb250cm9sQnV0dG9ucycsIFsnc2F2ZUZhY3RvcnknLCAnYXBwVmFsdWVzJywgZnVuY3Rpb24gKHNhdmVGYWN0b3J5LCBhcHBWYWx1ZXMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsIC8vIG9ubHkgbWF0Y2hlcyBlbGVtZW50IG5hbWVcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdjb250cm9sLWJ1dHRvbnMuaHRtbCcsIC8vINCz0LTQtSDRhdGA0LDQvdC40YLRgdGPIGh0bWxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24gKCkgeyAvLyDQt9Cw0LTQsNC10Lwg0LrQvtC90YLRgNC+0LvQu9C10YBcbiAgICAgICAgICB0aGlzLmluQmFza2V0ID0gYXBwVmFsdWVzLmluQmFza2V0OyAvLyDQt9Cw0LTQsNC10Lwg0YLQtdC60YPRidC10LUg0LfQvdCw0YfQtdC90LjQtSBpbkJhc2tldFxuICAgICAgICAgIHRoaXMuaGlkZVRvZ2dsZSA9IGFwcFZhbHVlcy5oaWRlVG9nZ2xlOyAvLyDQt9Cw0LTQsNC10Lwg0YLQtdC60YPRidC10LUg0LfQvdCw0YfQtdC90LjQtSBoaWRlVG9nZ2xlXG4gICAgICAgICAgdGhpcy5hZGROZXdUYXNrID0gZnVuY3Rpb24gKGRlc2NyKSB7IC8vINC00L7QsdCw0LLQu9GP0LXQvCDQvdC+0LLRg9GOINC30LDQtNCw0YfRgywg0L3QsCDQstGF0L7QtCDQv9C+0LTQsNC10YLRgdGPINGB0L7QtNC10YDQttCw0LXQvdC40LUg0LfQsNC00LDRh9C4XG4gICAgICAgICAgICBhcHBWYWx1ZXMudGFza3MucHVzaCh7IC8vINCyINC80LDRgdGB0LjQsiDQt9Cw0LTQsNGHINC00L7QsdCw0LLQu9GP0LXRgtGB0Y8g0L3QvtCy0YvQuSDQvtCx0YrQtdC60YIg0YFcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGRlc2NyIHx8ICcnLCAvL9C/0L7Qu9GD0YfQtdC90L3Ri9C8INC/0YDQuCDQstGL0LfQvtCy0LUg0YTRg9C90LrRhtC40Lgg0L7Qv9C40YHQsNC90LjQtdC8XG4gICAgICAgICAgICAgIGRlbGV0ZWQ6IGZhbHNlLCAvLyDQt9Cw0LTQsNGH0LAg0L3QtSDRg9C00LDQu9C10L3QsFxuICAgICAgICAgICAgICBkb25lOiBmYWxzZSwgLy8g0L3QtSDQstGL0L/QvtC70L3QtdC90LBcbiAgICAgICAgICAgICAgaGlkZTogZmFsc2UsIC8vINC90LUg0YHQutGA0YvRgtCwXG4gICAgICAgICAgICAgIG9uY2hhbmdlOiBmYWxzZSAvLyDQvdC1INC40LfQvNC10L3Rj9C10YLRgdGPINCyINGC0LXQutGD0YnQuNC5INC80L7QvNC10L3RglxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzYXZlRmFjdG9yeS5hZGROZXdUYXNrSW5NRCgpO1xuICAgICAgICAgICAgc2F2ZUZhY3RvcnkudGFza3NDaGFuZ2VkQnJvYWRjYXN0KCk7IC8vINGB0L7RhdGA0LDQvdC40YLRjCDQuNC30LzQtdC90LXQvdC40Y8g0LIgbG9jYWwgc3RvcmFnZVxuICAgICAgICAgIH07XG4gICAgICAgICAgdGhpcy50b2dnbGVEb25lID0gZnVuY3Rpb24gKCkgeyAvLyDRhNGD0L3QutGG0LjRjyDQtNC70Y8g0L/QtdGA0LXQutC70Y7Rh9C10L3QuNGPIGRvbmUvdW5kb25lINC30LDQtNCw0YfQuFxuICAgICAgICAgICAgdGhpcy5oaWRlVG9nZ2xlID0gYXBwVmFsdWVzLmhpZGVUb2dnbGUgPSAhYXBwVmFsdWVzLmhpZGVUb2dnbGU7IC8vINC/0LXRgNC10LrQu9GO0YfQsNC10LwgZG9uZS91bmRvbmUsINCz0LvQvtCx0LDQu9GM0L3Rg9GOINC4INCy0L3Rg9GC0YDQuCDQutC+0YLRgNC+0LvQu9C10YDQsFxuICAgICAgICAgICAgYXBwVmFsdWVzLnRhc2tzLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHsgLy8g0LTQu9GPINC60LDQttC00L7QuSDQt9Cw0LTQsNGH0LhcbiAgICAgICAgICAgICAgaXRlbS5kb25lICYmIGFwcFZhbHVlcy5oaWRlVG9nZ2xlICYmIChpdGVtLmhpZGUgPSB0cnVlKTsgLy8g0LXRgdC70Lgg0LfQsNC00LDRh9CwINGB0LTQtdC70LDQvdCwLCDQuCDQstGL0LHRgNCw0L3QviDRgdC60YDRi9Cy0LDRgtGMINGB0LTQtdC70LDQvdC90YvQtSDQt9Cw0LTQsNGH0LgsINGC0L4g0YHQutGA0YvQstCw0LXQvFxuICAgICAgICAgICAgICBpdGVtLmRvbmUgJiYgIWFwcFZhbHVlcy5oaWRlVG9nZ2xlICYmIChpdGVtLmhpZGUgPSBmYWxzZSk7IC8vINC10YHQuNC7INC30LDQtNCw0YfQsCDRgdC00LXQu9Cw0L3QsCwg0Lgg0LLRi9Cx0YDQsNC90L4g0L/QvtC60LDQt9GL0LLQsNGC0Ywg0YHQtNC10LvQsNC90L3Ri9C1INC30LDQtNCw0YfQuCwg0YLQviDQv9C+0LrQsNC30YvQstCw0LXQvFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzYXZlRmFjdG9yeS50YXNrc0NoYW5nZWRCcm9hZGNhc3QoKTsgLy8g0YHQvtGF0YDQsNC90LjRgtGMINC40LfQvNC10L3QtdC90LjRjyDQsiBsb2NhbCBzdG9yYWdlIFxuICAgICAgICAgIH07XG4gICAgICAgICAgdGhpcy50b2dnbGVEZWxldGVkVGFza3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmluQmFza2V0ID0gYXBwVmFsdWVzLmluQmFza2V0ID0gIWFwcFZhbHVlcy5pbkJhc2tldDsgLy8g0L/QtdGA0LXQutC70Y7Rh9Cw0LXQvCDQsiDQutC+0YDQt9C40L3QtS/QvdC1INCyINC60L7RgNC30LjQvdC1LCDQs9C70L7QsdCw0LvRjNC90YPRjiDQuCDQstC90YPRgtGA0Lgg0LrQvtGC0YDQvtC70LvQtdGA0LBcbiAgICAgICAgICAgIGFwcFZhbHVlcy50YXNrcy5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtLCBpKSB7IC8vINC00LvRjyDQutCw0LbQtNC+0Lkg0LfQsNC00LDRh9C4XG4gICAgICAgICAgICAgIGl0ZW0uaGlkZSA9IHRydWU7IC8vINGB0LrRgNGL0LLQsNC10Lwg0LrQsNC20LTRg9GOINC30LDQtNCw0YfRg1xuICAgICAgICAgICAgICBhcHBWYWx1ZXMuaW5CYXNrZXQgJiYgaXRlbS5kZWxldGVkICYmIChpdGVtLmhpZGUgPSBmYWxzZSk7IC8vINC10YHQu9C4INCyINC00LDQvdC90YvQuSDQvNC+0LzQtdC90YIg0L/QvtC70YzQt9C+0LLQsNGC0LXQu9GMINC90LDRhdC+0LTQuNGC0YHRjyDQsiDQutC+0YDQt9C40L3QtSwg0Lgg0LfQsNC00LDRh9CwINGD0LTQsNC70LXQvdCwLCDRgtC+INC/0L7QutCw0LfRi9Cy0LDQtdC8INC30LDQtNCw0YfRg1xuICAgICAgICAgICAgICAhYXBwVmFsdWVzLmluQmFza2V0ICYmICFpdGVtLmRlbGV0ZWQgJiYgKGl0ZW0uaGlkZSA9IGZhbHNlKTsgLy8g0LXRgdC70Lgg0L/QvtC70YzQt9C+0LLQsNGC0LXQu9GMINC90LUg0L3QsNGF0L7QtNC40YLRgdGPINCyINC60L7RgNC30LjQvdC1LCDQuCDQt9Cw0LTQsNGH0LAg0L3QtSDRg9C00LDQu9C10L3QsCwg0YLQviDQv9C+0LrQsNC30YvQstCw0LXQvCDQtdGRXG4gICAgICAgICAgICAgICFhcHBWYWx1ZXMuaW5CYXNrZXQgJiYgYXBwVmFsdWVzLmhpZGVUb2dnbGUgJiYgaXRlbS5kb25lICYmIChpdGVtLmhpZGUgPSB0cnVlKTsgLy8g0LXRgdC70Lgg0L/QvtC70YzQt9C+0LLQsNGC0LXQu9GMINC90LUg0LIg0LrQvtGA0LfQuNC90LUsINC90LXQvtGF0L7QtNC40LzQviDRgdC60YDRi9Cy0LDRgtGMINGB0LTQtdC70LDQvdC90YvQtSDQt9Cw0LTQsNGH0LgsINCwINC30LDQtNCw0YfQsCDRgdC00LXQu9Cw0L3QsCwg0YLQviDRgdC60YDRi9Cy0LDQtdC8INC10ZFcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc2F2ZUZhY3RvcnkudGFza3NDaGFuZ2VkQnJvYWRjYXN0KCk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfSxcbiAgICAgICAgY29udHJvbGxlckFzOiAnYnRuQ3RybCcgLy8g0L/RgdC10LLQtNC+0L3QuNC8INC00LvRjyDQutC+0L3RgtGA0L7Qu9C70LXRgNCwXG4gICAgICB9O1xuICB9XSlcbiAgICAvKiDQlNC40YDQtdC60YLQuNCy0LAg0LTQu9GPINGB0L/QuNGB0LrQsCDQt9Cw0LTQsNGHICovXG4gICAgLmRpcmVjdGl2ZSgndGFza3NMaXN0JywgWydzYXZlRmFjdG9yeScsICdhcHBWYWx1ZXMnLCBmdW5jdGlvbiAoc2F2ZUZhY3RvcnksIGFwcFZhbHVlcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJywgLy8gb25seSBtYXRjaGVzIGVsZW1lbnQgbmFtZVxuICAgICAgICB0ZW1wbGF0ZVVybDogJ3Rhc2tzLWxpc3QuaHRtbCcsIC8vINCz0LTQtSDRhdGA0LDQvdC40YLRgdGPIGh0bWxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHRoaXMucmV0dXJuSWRJbmRleCA9IGZ1bmN0aW9uICh0YXNrKSB7XG4gICAgICAgICAgICBsZXQgaWQ7XG4gICAgICAgICAgICBsZXQgaW5kZXg7XG4gICAgICAgICAgICBsZXQgaSA9IGFwcFZhbHVlcy50YXNrcy5sZW5ndGggLSAxOyAvLyDQv9C10YDQtdC80LXQvdC90LDRjyDQtNC70Y8g0YXRgNCw0L3QtdC90LjRjyDQtNC70LjQvdGLINC80LDRgdGB0LjQstCwIC0xXG4gICAgICAgICAgICB3aGlsZSAoaSA+PSAwKSB7IC8vINC/0L7QutCwINCyINC80LDRgdGB0LjQstC1INC10YnRkSDQtdGB0YLRjCDRjdC70LXQvNC10L3RgtGLXG4gICAgICAgICAgICAgIGlmIChhcHBWYWx1ZXMudGFza3NbaV0uJCRoYXNoS2V5ID09PSB0YXNrLiQkaGFzaEtleSkgeyAvLyDQtdGB0LvQuCBoYXNoS2V5INGN0LvQtdC80LXQvdGC0LAg0YDQsNCy0LXQvSBoYXNrS2V5INGD0LTQsNC70Y/QtdC80L7QuSDQt9Cw0LTQsNGH0LhcbiAgICAgICAgICAgICAgICBpZCA9IGFwcFZhbHVlcy50YXNrc1tpXS5faWQ7IC8vINGC0L4g0YHQvtGF0YDQsNC90Y/QtdC8INC40L3QtNC10LrRgSDQt9Cw0LTQsNGH0Lgg0LIg0LzQsNGB0YHQuNCy0LVcbiAgICAgICAgICAgICAgICBpbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgYnJlYWs7IC8vINC/0YDQtdC60YDQsNGJ0LDQtdC8INCy0YvQv9C+0LvQvdC10L3QuNC1INGG0LjQutC70LBcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpLS07IC8vINC00LXQu9Cw0LXQvCDRgdC70LXQtNGD0Y7RidC40Lkg0YjQsNCzXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICAgIGluZGV4OiBpbmRleFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLnRhc2tzID0gYXBwVmFsdWVzLnRhc2tzOyAvLyDQv9C+0LvRg9GH0LDQtdC8INGB0L/QuNGB0L7QuiDQt9Cw0LTQsNGHXG4gICAgICAgICAgdGhpcy5jaGFuZ2VUYXNrID0gZnVuY3Rpb24gKHRhc2ssIGRlc2NyaXB0aW9uKSB7IC8vINGE0YPQvdC60YbQuNGPINC00LvRjyDQuNC30LzQtdC90LXQvdC40Y8g0YLQtdC60YPRidC10LPQviDRgdC+0LTQtdGA0LbQsNC90LjRjyDQt9Cw0LTQsNGH0LhcbiAgICAgICAgICAgIHRhc2sub25jaGFuZ2UgPSAhdGFzay5vbmNoYW5nZTsgLy8g0L/QtdGA0LXQutC70Y7Rh9Cw0LXQvCBvbmNoYW5nZSDQtNC70Y8g0LfQsNC00LDRh9C4XG4gICAgICAgICAgICBkZXNjcmlwdGlvbiAmJiAodGFzay5kZXNjcmlwdGlvbiA9IGRlc2NyaXB0aW9uKTsgLy8g0LXRgdC70Lgg0LIg0YTRg9C90LrRhtC40Y4g0L/QtdGA0LXQtNCw0L3QviDRgdC+0LTQtdGA0LDQttCw0LXQvdC40LUg0LTQu9GPINC30LDQv9C40YHQuCDQsiDQt9Cw0LTQsNGH0YMsINGC0L4g0LfQsNC/0LjRgdGL0LLQsNC10Lwg0LXQs9C+XG4gICAgICAgICAgICBzYXZlRmFjdG9yeS50YXNrc0NoYW5nZWRCcm9hZGNhc3QoKTsgLy8g0YHQvtGF0YDQsNC90Y/QtdC8INC40LfQvNC10L3QtdC90LjRjyDQsiBsb2NhbCBzdG9yYWdlXG4gICAgICAgICAgICBsZXQgaWRJbmRleCA9IHRoaXMucmV0dXJuSWRJbmRleCh0YXNrKTtcbiAgICAgICAgICAgIHNhdmVGYWN0b3J5LmNoYW5nZVRhc2tJbk1EKGlkSW5kZXguaWQsIGlkSW5kZXguaW5kZXgpO1xuICAgICAgICAgIH07XG4gICAgICAgICAgdGhpcy50b2dnbGVEb25lID0gZnVuY3Rpb24gKHRhc2spIHsgLy8g0YTRg9C90LrRhtC40Y8g0LTQu9GPINC40LfQvNC10L3QtdC90LjRjyBkb25lL3VuZG9uZSDQt9Cw0LTQsNGH0LhcbiAgICAgICAgICAgIHRhc2suZG9uZSA9ICF0YXNrLmRvbmU7IC8vINC/0LXRgNC10LrQu9GO0YfQsNC10LwgZG9uZS91bmRvbmUg0LTQu9GPINC30LDQtNCw0YfQuFxuICAgICAgICAgICAgYXBwVmFsdWVzLmhpZGVUb2dnbGUgJiYgKHRhc2suaGlkZSA9IHRydWUpOyAvLyDQtdGB0LvQuCDQstGL0LHRgNCw0L3QviDRgdC60YDRi9Cy0LDRgtGMINGB0LTQtdC70LDQvdC90YvQtSDQt9Cw0LTQsNGH0LgsINGC0L4g0YHQutGA0YvQstCw0LXQvCDRgtC+0LvRjNC60L4g0YfRgtC+INC+0YLQvNC10YfQtdC90L3Rg9GOINC30LDQtNCw0YfRgy8vINC/0LXRgNC10LzQtdC90L3QsNGPINC00LvRjyDRhdGA0LDQvdC10L3QuNGPINC40L3QtNC10LrRgdCwXG4gICAgICAgICAgICBsZXQgaWRJbmRleCA9IHRoaXMucmV0dXJuSWRJbmRleCh0YXNrKTtcbiAgICAgICAgICAgIHNhdmVGYWN0b3J5LmNoYW5nZVRhc2tJbk1EKGlkSW5kZXguaWQsIGlkSW5kZXguaW5kZXgpO1xuICAgICAgICAgICAgc2F2ZUZhY3RvcnkudGFza3NDaGFuZ2VkQnJvYWRjYXN0KCk7XG4gICAgICAgICAgfTtcbiAgICAgICAgICB0aGlzLmRlbGV0ZVRhc2sgPSBmdW5jdGlvbiAodGFzaykgeyAvLyDRhNGD0L3QutGG0LjRjyDQtNC70Y8g0L/QtdGA0LXQvNC10YnQtdC90LjRjyDQt9Cw0LTQsNGH0Lgg0LIg0LrQvtGA0LfQuNC90YNcbiAgICAgICAgICAgIHRhc2suZGVsZXRlZCA9IHRydWU7IC8vINC30LDQtNCw0YfQsCDRj9Cy0LvRj9C10YLRgdGPINGD0LTQsNC70LXQvdC90L7QuVxuICAgICAgICAgICAgdGFzay5oaWRlID0gdHJ1ZTsgLy8g0YHQutGA0YvRgtC+0LlcbiAgICAgICAgICAgIHRhc2suZG9uZSA9IGZhbHNlOyAvLyDQuCDQvdC1INCy0YvQv9C+0LvQvdC10L3QvdC+0LlcbiAgICAgICAgICAgIGxldCBpZEluZGV4ID0gdGhpcy5yZXR1cm5JZEluZGV4KHRhc2spO1xuICAgICAgICAgICAgc2F2ZUZhY3RvcnkuY2hhbmdlVGFza0luTUQoaWRJbmRleC5pZCwgaWRJbmRleC5pbmRleCk7XG4gICAgICAgICAgICBzYXZlRmFjdG9yeS50YXNrc0NoYW5nZWRCcm9hZGNhc3QoKTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIHRoaXMucmV0dXJuVGFzayA9IGZ1bmN0aW9uICh0YXNrKSB7IC8vINGE0YPQvdC60YbQuNGPINC00LvRjyDQstC+0LfQstGA0LDRidC10L3QuCDQt9Cw0LTQsNGH0Lgg0LjQtyDQutC+0YDQt9C40L3Ri1xuICAgICAgICAgICAgdGFzay5kZWxldGVkID0gZmFsc2U7IC8vINC30LDQtNCw0YfQsCDRj9Cy0LvRj9C10YLRgdGPINC90LUg0YPQtNCw0LvQtdC90L3QvtC5XG4gICAgICAgICAgICB0YXNrLmhpZGUgPSB0cnVlOyAvLyDRgdC60YDRi9Cy0LDQtdC8INC10ZEg0LjQtyDQutC+0YDQt9C40L3Ri1xuICAgICAgICAgICAgbGV0IGlkSW5kZXggPSB0aGlzLnJldHVybklkSW5kZXgodGFzayk7XG4gICAgICAgICAgICBzYXZlRmFjdG9yeS5jaGFuZ2VUYXNrSW5NRChpZEluZGV4LmlkLCBpZEluZGV4LmluZGV4KTtcbiAgICAgICAgICAgIHNhdmVGYWN0b3J5LnRhc2tzQ2hhbmdlZEJyb2FkY2FzdCgpO1xuICAgICAgICAgIH07XG4gICAgICAgICAgdGhpcy5maW5hbGx5RGVsZXRlVGFzayA9IGZ1bmN0aW9uICh0YXNrKSB7IC8vINGE0YPQvdC60YbQuNGPINC00LvRjyDQvtC60L7QvdGH0LDRgtC10LvRjNC90L7Qs9C+INGD0LTQsNC70LXQvdC40Y8g0LfQsNC00LDRh9C4XG4gICAgICAgICAgICBpZiAoY29uZmlybSgn0KLQvtGH0L3QviDRg9C00LDQu9C40YLRjCDQt9Cw0LTQsNGH0YM/JykpIHsgLy8g0LfQsNC/0YDQvtGBINC/0L7Qu9GM0LfQvtCy0LDRgtC10LvRjiDRgtC+0YfQvdC+INC70Lgg0L7QvSDRhdC+0YfQtdGCINGD0LTQsNC70LjRgtGMINC30LDQtNCw0YfRgywg0LXRgdC70Lgg0LTQsCwg0YLQviDQv9C10YDQtdGF0L7QtNC40Lwg0Log0YPQtNCw0LvQtdC90LjRjlxuICAgICAgICAgICAgICBsZXQgaWRJbmRleCA9IHRoaXMucmV0dXJuSWRJbmRleCh0YXNrKTtcbiAgICAgICAgICAgICAgYXBwVmFsdWVzLnRhc2tzLnNwbGljZShpZEluZGV4LmluZGV4LCAxKTsgLy8g0YPQtNCw0LvRj9C10Lwg0LfQsNC00LDRh9GDINC40Lcg0LzQsNGB0YHQuNCy0LAg0LfQsNC00LDRh1xuICAgICAgICAgICAgICBzYXZlRmFjdG9yeS5kZWxldGVUYXNrRnJvbU1EKGlkSW5kZXguaWQpO1xuICAgICAgICAgICAgICBzYXZlRmFjdG9yeS50YXNrc0NoYW5nZWRCcm9hZGNhc3QoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyQXM6ICd0YXNrQ3RybCcgLy8g0YPRgdGC0LDQvdCw0LLQu9C40LLQsNC10Lwg0L/RgdC10LLQtNC+0L3QuNC8INC00LvRjyDQutC+0L3RgtGA0L7Qu9C70LXRgNCwXG4gICAgICB9O1xuICB9XSlcbiAgICAvKiDQmtC+0L3RgtGA0L7Qu9C70LXRgCDQtNC70Y8gcGllINGB0YLQsNGC0LjRgdGC0LjQutC4ICovXG4gICAgLmNvbnRyb2xsZXIoJ1BpZUN0cmwnLCBbJyRzY29wZScsICckcm9vdFNjb3BlJywgJ2FwcFZhbHVlcycsICdzYXZlRmFjdG9yeScsIGZ1bmN0aW9uICgkc2NvcGUsICRyb290U2NvcGUsIGFwcFZhbHVlcywgc2F2ZUZhY3RvcnkpIHtcbiAgICAgIC8vINC40L3QuNGG0LjQsNC70LjQt9C40YDRg9C10Lwg0YHRgtCw0YDRgtC+0LLRi9C1INC30L3QsNGH0LXQvdC40Y9cbiAgICAgICRzY29wZS5zaG93Q2FudmFzID0gYXBwVmFsdWVzLnN0YXRpc3RpYzsgLy8gY9C60YDRi9Cy0LDQtdC8IC8g0L/QvtC60LDQt9GL0LLQsNC10LwgY2FudmFzIGMgcGllIHN0YXRpc3RpY1xuICAgICAgJHNjb3BlLmhpZGVTaG93QnV0dG9uQ29udGVudCA9ICRzY29wZS5zaG93Q2FudmFzID09PSBmYWxzZSA/ICdzaG93IHN0YXRpc3RpY3MnIDogJ2hpZGUgc3RhdGlzdGljcyc7IC8vINC/0L7Qu9GD0YfQsNC10Lwg0YHQvtC00LXRgNC20LDQvdC40LUg0LTQu9GPIGJ1dHRvblxuICAgICAgJHNjb3BlLnBpZVRhc2trQnV0dG9uSGlkZSA9IChhcHBWYWx1ZXMudGFza3MubGVuZ3RoID4gMCkgPyBmYWxzZSA6IHRydWU7IC8vINC10YHQu9C4INC90LXRgiDQt9Cw0LTQsNGHLCDRgtC+INC90LUg0L/QvtC60LDQt9GL0LLQsNC10LwgYnV0dG9uXG4gICAgICAvLyDQv9GA0Lgg0LrQu9C40LrQtSDQvdCwIGJ1dHRvblxuICAgICAgJHNjb3BlLnNob3dIaWRlQ2xpY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGFwcFZhbHVlcy5zdGF0aXN0aWMgPSAkc2NvcGUuc2hvd0NhbnZhcyA9ICEkc2NvcGUuc2hvd0NhbnZhczsgLy8g0YLQvtCz0LPQu9C40Lwg0LfQvdCw0YfQtdC90LjQtSDQtNC70Y8gYXBwVmFsdWVzLnN0YXRpc3RpY1xuICAgICAgICAkc2NvcGUuaGlkZVNob3dCdXR0b25Db250ZW50ID0gJHNjb3BlLnNob3dDYW52YXMgPT09IGZhbHNlID8gJ3Nob3cgc3RhdGlzdGljcycgOiAnaGlkZSBzdGF0aXN0aWNzJzsgLy8g0LzQtdC90Y/QtdC8INGB0L7QtNC10YDQttCw0L3QuNC1INC00LvRjyBidXR0b25cbiAgICAgICAgc2F2ZUZhY3RvcnkudGFza3NDaGFuZ2VkQnJvYWRjYXN0KCk7XG4gICAgICB9O1xuICAgICAgLy8g0LXRgdC70Lgg0L/RgNC40YjQu9C+INC+0L/QvtCy0LXRidC10L3QuNC1INC+INGC0L7QvCwg0YfRgtC+INCyIHRhc2tzINC/0YDQvtC40LfQvtGI0LvQuCDQuNC30LzQtdC90LXQvdC40Y9cbiAgICAgICRyb290U2NvcGUuJG9uKCdUYXNrc0NoYW5nZWQnLCBmdW5jdGlvbiAoKSB7IC8vINGE0YPQvdC60YbQuNGPINC+0LHQvdC+0LLQu9C10L3QuNGPINGB0YLQsNGC0LjRgdGC0LjQutC4XG4gICAgICAgIC8vINC/0LXRgNC10LzQtdC90L3Ri9C1INC00LvRjyDRhdGA0LDQvdC10L3QuNGPINC30LDQtNCw0Yc6XG4gICAgICAgIGxldCBkb25lVGFza3MgPSAwOyAvLyDQstGL0L/QvtC70L3QtdC90L3Ri9GFXG4gICAgICAgIGxldCBkZWxldGVkVGFza3MgPSAwOyAvLyDRg9C00LDQu9C10L3QvdGL0YVcbiAgICAgICAgbGV0IHVuZG9uZVRhc2tzID0gMDsgLy8g0LXRidGRINC90LUg0YHQtNC10LvQsNC90L3Ri9GFXG4gICAgICAgIGlmIChhcHBWYWx1ZXMudGFza3MubGVuZ3RoID09PSAwKSB7IC8vINC10YHQu9C4INC90LXRgiDQt9Cw0LTQsNGHXG4gICAgICAgICAgYXBwVmFsdWVzLnN0YXRpc3RpYyA9IGZhbHNlOyAvLyDQvNC10L3Rj9C10Lwg0LfQvdCw0YfQtdC90LjQtSDQsiBhcHBWYWx1ZXNcbiAgICAgICAgICAkc2NvcGUuaGlkZVNob3dCdXR0b25Db250ZW50ID0gJ3Nob3cgc3RhdGlzdGljcyc7IC8vINC80LXQvdGP0LXQvCDQt9C90LDRh9C10L3QuNC1INC60L7QvdGC0LXQvdGC0LAg0LTQu9GPIGJ1dHRvblxuICAgICAgICB9XG4gICAgICAgICRzY29wZS5waWVUYXNra0J1dHRvbkhpZGUgPSAoYXBwVmFsdWVzLnRhc2tzLmxlbmd0aCA+IDApID8gZmFsc2UgOiB0cnVlOyAvLyDQtdGB0LvQuCDQvdC10YIg0LfQsNC00LDRhywg0YLQviDQvdC1INC/0L7QutCw0LfRi9Cy0LDQtdC8IGJ1dHRvblxuICAgICAgICAkc2NvcGUuc2hvd0NhbnZhcyA9ICEkc2NvcGUucGllVGFza2tCdXR0b25IaWRlICYmIGFwcFZhbHVlcy5zdGF0aXN0aWM7XG4gICAgICAgIGFwcFZhbHVlcy50YXNrcy5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7IC8vINGB0YfQuNGC0LDQtdC8INC60L7Qu9C40YfQtdGB0YLQstC+INGA0LDQt9C70LjRh9C90YvRhSDQt9Cw0LTQsNGHINCyINGB0L/QuNGB0LrQtSDQt9Cw0LTQsNGHXG4gICAgICAgICAgaXRlbS5kb25lICYmIChkb25lVGFza3MgKz0gMSk7IC8vINC10YHQu9C4INC30LDQtNCw0YfQsCDRgdC00LXQu9Cw0L3QsCwg0YLQviDRg9Cy0LXQu9C40YfQuNCy0LDQtdC8INC60L7Qu9C40YfQtdGB0YLQstC+INGB0LTQtdC70LDQvdC90YvRhSDQt9Cw0LTQsNGHXG4gICAgICAgICAgaXRlbS5kZWxldGVkICYmIChkZWxldGVkVGFza3MgKz0gMSk7IC8vINC10YHQu9C4INC30LDQtNCw0YfQsCDRg9C00LDQu9C10L3QsCwg0YLQviDRg9Cy0LXQu9C40YfQuNCy0LDQtdC8INC60L7Qu9C40YfQtdGB0YLQstC+INGD0LTQsNC70LXQvdC90YvRhSDQt9Cw0LTQsNGHXG4gICAgICAgICAgIWl0ZW0uZGVsZXRlZCAmJiAhaXRlbS5kb25lICYmICh1bmRvbmVUYXNrcyArPSAxKTsgLy8g0LXRgdC70Lgg0LfQsNC00LDRh9CwINC90LUg0YHQtNC10LvQsNC90LAsINC4INC90LUg0YPQtNCw0LvQtdC90LAsINGC0L4g0YPQstC10LjRh9C40LLQsNC10Lwg0LrQvtC70LjRh9C10YHRgtCy0L4g0LXRidGRINC90LUg0YHQtNC10LvQsNC90L3Ri9GFINC30LDQtNCw0YdcbiAgICAgICAgfSk7XG4gICAgICAgIC8vINC30LDQtNCw0LXQvCDQt9C90LDRh9C10L3QuNGPINC00LvRjyBwaWUgc3RhdGlzdGljXG4gICAgICAgICRzY29wZS5kYXRhID0ge1xuICAgICAgICAgIGRhdGFzZXRzOiBbe1xuICAgICAgICAgICAgbGFiZWw6IFwiTXkgZGF0YXNldFwiLFxuICAgICAgICAgICAgZGF0YTogW1xuICAgICAgICAgIGRlbGV0ZWRUYXNrcyxcbiAgICAgICAgICBkb25lVGFza3MsXG4gICAgICAgICAgdW5kb25lVGFza3NcbiAgICAgICAgXSxcbiAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogW1xuICAgICAgICAgIFwiI0Y3NDY0QVwiLFxuICAgICAgICAgIFwiIzQ2QkZCRFwiLFxuICAgICAgICAgIFwiI0ZEQjQ1Q1wiXG4gICAgICAgIF1cbiAgICAgIH1dLFxuICAgICAgICAgIGxhYmVsczogW1xuICAgICAgICBcIkRlbGV0ZWQgdGFza3NcIixcbiAgICAgICAgXCJEb25lIHRhc2tzXCIsXG4gICAgICAgIFwiVW5kb25lIHRhc2tzXCJcbiAgICAgIF1cbiAgICAgICAgfTtcbiAgICAgICAgLy8g0LfQsNC00LDQtdC8INC90LDRgdGC0YDQvtC50LrQuCDQtNC70Y8gcGllIHN0YXRpc3RpY1xuICAgICAgICAkc2NvcGUub3B0aW9ucyA9IHtcbiAgICAgICAgICBsZWdlbmQ6IHtcbiAgICAgICAgICAgIGRpc3BsYXk6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgIGxlZ2VuZENhbGxiYWNrOiBmdW5jdGlvbiAoY2hhcnQpIHtcbiAgICAgICAgICAgIHZhciB0ZXh0ID0gW107XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoYXJ0LmRhdGEuZGF0YXNldHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgdmFyIGRhdGFzZXQgPSBjaGFydC5kYXRhLmRhdGFzZXRzW2ldO1xuICAgICAgICAgICAgICB0ZXh0LnB1c2goJycpO1xuICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGRhdGFzZXQuZGF0YS5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHRleHQucHVzaCgnJyk7XG4gICAgICAgICAgICAgICAgdGV4dC5wdXNoKGNoYXJ0LmRhdGEubGFiZWxzW2pdKTtcbiAgICAgICAgICAgICAgICB0ZXh0LnB1c2goJycpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHRleHQucHVzaCgnJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGV4dC5qb2luKFwiXCIpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgcmVzcG9uc2l2ZTogdHJ1ZVxuICAgICAgICB9O1xuICAgICAgfSk7XG4gICAgfV0pXG59KCkpOyJdfQ==
