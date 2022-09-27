'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + ``).slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _workoutDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = `running`;
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._workoutDescription();
  }

  calcPace() {
    this.pace = this.distance / this.duration;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = `cycling`;
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
    this._workoutDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 13;
  #coords;

  constructor() {
    this._getPosition();

    this._getLocalStorage();

    containerWorkouts.addEventListener(
      'dblclick',
      this._editWorkout.bind(this)
    );

    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleElevationField);

    containerWorkouts.addEventListener('click', this._focusWorkout.bind(this));
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert(`Could not get your current location`);
      }
    );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(workout => this._showMarket(workout));
  }

  _showForm(e) {
    this.#mapEvent = e;
    form.classList.remove('hidden');
  }

  _hiddenForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        ``;

    form.classList.add('hidden');
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    const dataValid = (...datas) => datas.every(dat => Number.isFinite(dat));
    const allPositive = (...datas) => datas.every(dat => dat > 0);

    // get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let workout;
    if (!this.#coords) {
      const { lat, lng } = this.#mapEvent.latlng;
      this.#coords = [lat, lng];
    }

    // if workout is running
    if (type === `running`) {
      const cadence = +inputCadence.value;
      if (
        // check the data is valid
        !dataValid(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert(`Not a positive number!`);
      }

      workout = new Running(this.#coords, distance, duration, cadence);
    }

    // if workout is cycling
    if (type === `cycling`) {
      const elevation = +inputElevation.value;
      if (
        !dataValid(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        return alert(`Not a positive number!`);
      }

      workout = new Cycling(this.#coords, distance, duration, elevation);
    }

    // add the workout into activity array
    this.#workouts.push(workout);

    // render the workout in marker
    this._showMarket(workout);

    // render the workout in list
    this._renderWorkout(workout);

    // hidden and clear the form
    this._hiddenForm();

    // local storage
    this._setLocalStorage();
  }

  _showMarket(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === `running` ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();

    form.classList.add('hidden');
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === `running` ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>`;

    if (workout.type === `running`)
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
  </li>`;

    if (workout.type === `cycling`)
      html += `
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevation}</span>
      <span class="workout__unit">m</span>
    </div>
  </li>`;

    form.insertAdjacentHTML(`afterend`, html);
  }

  _focusWorkout(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const workout = this.#workouts.find(wok => wok.id === workoutEl.dataset.id);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(workout => this._renderWorkout(workout));
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  _editWorkout(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    workoutEl.remove();
    let workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);
    console.log(workout);
    const workoutCopy = { ...workout };

    this._showForm();

    inputType.value = workoutCopy.type;

    inputDistance.value = workoutCopy.distance;
    workout.distance = inputDistance.value;
    inputDuration.value = workoutCopy.duration;
    workout.duration = inputDuration.value;
    if (inputType.value === 'running') {
      inputCadence.value = workoutCopy.cadence;
      workout.cadence = inputCadence.value;
    } else {
      inputElevation.value = workoutCopy.elevation;
      workout.elevation = inputElevation.value;
    }

    this.#coords = workoutCopy.coords;

    for (let i = 0; i < this.#workouts.length; i++) {
      if (this.#workouts[i].coords === workoutCopy.coords) {
        this.#workouts[i] = workout;
      }
    }
  }
}

const app = new App();
