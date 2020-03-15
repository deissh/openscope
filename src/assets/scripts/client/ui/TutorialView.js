/* eslint-disable max-len, indent, no-undef, prefer-destructuring */
import $ from 'jquery';
import _has from 'lodash/has';
import AirportController from '../airport/AirportController';
import EventBus from '../lib/EventBus';
import EventTracker from '../EventTracker';
import TimeKeeper from '../engine/TimeKeeper';
import TutorialStep from './TutorialStep';
import { round, clamp } from '../math/core';
import { EVENT } from '../constants/eventNames';
import { STORAGE_KEY } from '../constants/storageKeys';
import { SELECTORS } from '../constants/selectors';
import { TRACKABLE_EVENT } from '../constants/trackableEvents';

const tutorial = {};

const TUTORIAL_TEMPLATE = '' +
    '<div id="tutorial">' +
    '   <h1></h1>' +
    '   <main></main>' +
    '   <div class="prev"><img src="assets/images/prev.png" title="Previous step" /></div>' +
    '   <div class="next"><img src="assets/images/next.png" title="Next step" /></div>' +
    '</div>';

/**
 * @class TutorialView
 */
export default class TutorialView {
    /**
     * @constructor
     */
    constructor($element = null) {
        /**
         * @property EventBus
         * @type {EventBus}
         * @default EventBus
         * @private
         */
        this._eventBus = EventBus;

        /**
         * @property tutorial
         * @type {}
         * @private
         */
        this.tutorial = null;

        /**
         * Root DOM element
         *
         * @property $element
         * @type {jquery|HTML Element}
         * @default $element
         */
        this.$element = $element;

        /**
         * Root tutorial DOM element
         *
         * @property $tutorialView
         * @type {jquery|HTML Element}
         * @default `#tutorial`
         */
        this.$tutorialView = null;

        /**
         * Previous tutorial step button
         *
         * @property $tutorialPrevious
         * @type {jquery|HTML Element}
         * @default `.prev`
         */
        this.$tutorialPrevious = null;

        /**
         * Next tutorial step button
         *
         * @property $tutorialNext
         * @type {jquery|HTML Element}
         * @default `.next`
         */
        this.$tutorialNext = null;


        /**
         * Command bar button to toggle the tutorial on/off
         *
         * @for TutorialView
         * @property $toggleTutorial
         * @type {jquery|HTML Element}
         */
        this.$toggleTutorial = null;

        this._init()
            ._setupHandlers()
            .layout()
            .enable();
    }

    /**
     * Lifecycle method should be run once on application init.
     *
     * Caches selectors in variabls so they only need to be looked up one time.
     *
     * @for TutorialView
     * @method _init
     * @chainable
     */
    _init() {
        this.$tutorialView = $(TUTORIAL_TEMPLATE);
        this.$tutorialPrevious = this.$tutorialView.find(SELECTORS.DOM_SELECTORS.PREV);
        this.$tutorialNext = this.$tutorialView.find(SELECTORS.DOM_SELECTORS.NEXT);
        this.$toggleTutorial = $(SELECTORS.DOM_SELECTORS.TOGGLE_TUTORIAL);

        this.tutorial = tutorial;
        this.tutorial.steps = [];
        this.tutorial.step = 0;
        this.tutorial.open = false;

        return this;
    }

    /**
     * Create event handlers
     *
     * Should be run once only on instantiation
     *
     * @for TutorialView
     * @method _setupHandlers
     * @chainable
     */
    _setupHandlers() {
        this._onAirportChangeHandler = this.onAirportChange.bind(this);
        this._onTutorialToggleHandler = this.tutorial_toggle.bind(this);

        return this;
    }

    /**
     * Lifecycle method should be run once on application init.
     *
     * Adds the TUTORIAL_TEMPLATE to the view
     *
     * @for TutorialView
     * @method layout
     * @chainable
     */
    layout() {
        if (!this.$element) {
            throw new Error('Expected $element to be defined. `body` tag does not exist in the DOM');
        }

        this.tutorial.html = this.$tutorialView;
        this.$element.append(this.$tutorialView);

        return this;
    }

    /**
     * Lifecycle method should be run once on application init.
     *
     * @for TutorialView
     * @method enable
     * @chainable
     */
    enable() {
        this._eventBus.on(EVENT.TOGGLE_TUTORIAL, this._onTutorialToggleHandler);
        this._eventBus.on(EVENT.AIRPORT_CHANGE, this._onAirportChangeHandler);

        this.$tutorialPrevious.on('click', (event) => this.tutorial_prev(event));
        this.$tutorialNext.on('click', (event) => this.tutorial_next(event));

        return this;
    }

    /**
     * Disable any click handlers.
     *
     * @for TutorialView
     * @method disable
     * @chainable
     */
    disable() {
        this._eventBus.off(EVENT.TOGGLE_TUTORIAL, this._onTutorialToggleHandler);
        this._eventBus.off(EVENT.AIRPORT_CHANGE, this._onAirportChangeHandler);

        this.$tutorialPrevious.off('click', (event) => this.tutorial_prev(event));
        this.$tutorialNext.off('click', (event) => this.tutorial_next(event));

        return this.destroy();
    }

    /**
     * Tear down the view and unset any properties.
     *
     * @for TutorialView
     * @method destroy
     * @chainable
     */
    destroy() {
        this.$tutorialView = null;
        this.$tutorialPrevious = null;
        this.$tutorialNext = null;
        this.tutorial = {};
        this.tutorial.steps = [];
        this.tutorial.step = 0;
        this.tutorial.open = false;

        return this;
    }

    /**
     * Return whether the tutorial dialog is currently open
     *
     * @for TutorialView
     * @method isTutorialDialogOpen
     * @return {boolean}
     */
    isTutorialDialogOpen() {
        return this.$tutorialView.hasClass(SELECTORS.CLASSNAMES.OPEN);
    }

    /**
     * Reloads the tutorial when the airport is changed.
     *
     * @for TutorialView
     * @method onAirportChange
     */
    onAirportChange() {
        this.tutorial_init_pre();
        this.tutorial_update_content();
    }

    /**
     * @for TutorialView
     * @method tutorial_init_pre
     */
    tutorial_init_pre() {
        this.tutorial = {};
        this.tutorial.steps = [];
        this.tutorial.step = 0;

        const tutorial_position = [0.1, 0.85];
        const departureAircraft = prop.aircraft.list.filter((aircraftModel) => aircraftModel.isDeparture())[0];

        this.tutorial_step({
            title: 'Welcome!',
            text: ['Welcome to OpenScope Air Traffic Control simulator. It\'s not easy',
                   'to control dozens of aircraft while maintaining safe distances',
                   'between them; to get started with the tutorial, click the arrow on',
                   'the right. You can find the tutorial on/off toggle at the bottom right',
                   'when you expand the "?" icon.'
                ].join(' '),
            position: tutorial_position
        });

        this.tutorial_step({
            title: 'Moving Around',
            text: ['To move the middle of the radar screen, use the right click button and drag.',
                'Zoom in and out by scrolling, and press the middle mouse button or scroll wheel to reset the zoom.',
                'To select an aircraft when it is in your control, simply left-click.'
            ].join(' '),
            position: tutorial_position
        });

        this.tutorial_step({
            title: 'Departing aircraft',
            text: ['Let\'s route some planes out of here. On the right side of the screen, there',
                   'should be a strip with a blue bar on the left, meaning the strip represents a departing aircraft.',
                   'Click the first one ({CALLSIGN}). The aircraft\'s callsign will appear in the command entry box',
                   'and the strip will move slightly to the side. This means that the aircraft is selected.'
            ].join(' '),
            parse: (t) => {
                if (prop.aircraft.list.length <= 0) {
                    return t;
                }

                return t.replace('{CALLSIGN}', departureAircraft.callsign);
            },
            side: 'left',
            position: tutorial_position
        });

        this.tutorial_step({
            title: 'Clearance',
            text: ['First off, you must clear the aircraft to its destination. To do this, select your aircarft and type "caf" (for "cleared as filed").',
                   'If required, you can also change the SID the aircraft follows and more! Check out all commands at the end of this tutorial!'
            ].join(' '),
            parse: (t) => {
                if (prop.aircraft.list.length < 0) {
                    return t;
                }

                return t.replace(/{RUNWAY}/g, departureAircraft.fms.departureRunwayModel.name);
            },
            side: 'left',
            position: tutorial_position
        });

        this.tutorial_step({
            title: 'Taxiing',
            text: ['Now type in "taxi {RUNWAY}" into the command box after the callsign and hit',
                   'Return; the aircraft should appear on the radar scope after 3 or so seconds'
            ].join(' '),
            parse: (t) => {
                if (prop.aircraft.list.length <= 0) {
                    return t;
                }

                return t.replace('{RUNWAY}', departureAircraft.fms.departureRunwayModel.name);
            },
            side: 'left',
            position: tutorial_position
        });

        this.tutorial_step({
            title: 'Takeoff',
            text: ['Now the aircraft is ready for take off. Click the aircraft again',
                   'and type "takeoff" (or "to") to clear the aircraft for take off.',
                   'Once it\'s going fast enough, it should lift off the ground and you should',
                   'see its altitude increasing. Meanwhile, read the next step.'
            ].join(' '),
            side: 'left',
            position: tutorial_position
        });

        this.tutorial_step({
            title: 'Aircraft strips, part 1',
            text: ['On the right, there\'s a row of strips, one for each aircraft. You may need to pull it out with the',
                   '\'|<\' tab. Each strip has a bar on its left side, colored blue for departures and red for arrivals.'
            ].join(' '),
            side: 'left',
            position: tutorial_position
        });

        this.tutorial_step({
            title: 'Aircraft strips, part 2',
            text: ['The strip is split into four parts: the left section shows te aircraft\'s callsign, model number',
                   '(in this case {MODEL}, representing {MODELNAME}), and computer identification number.',
                   'The next column has the aircraft\' transponder code, assigned altitude, and flight plan altitude',
                   'and the two rightmost blocks contain the departure airport code and flight plan route.'
            ].join(' '),
            parse: (t) => {
                if (prop.aircraft.list.length <= 0) {
                    return t;
                }

                return t.replace('{MODEL}', departureAircraft.model.icao)
                        .replace('{MODELNAME}', departureAircraft.model.name);
            },
            side: 'left',
            position: tutorial_position
        });

        this.tutorial_step({
            title: 'Moving aircraft',
            text: ['Once {CALLSIGN} has taken off, you\'ll notice it will climb to {INIT_ALT} by itself. This is one of the instructions ',
                    'we gave them when we cleared them "as filed". Aircraft perform better when they are able to climb directly',
                    'from the ground to their cruise altitude without leveling off, so let\'s keep them climbing! Click it and type "cvs" (for',
                    '"climb via SID"). Then they will follow the altitudes and speeds defined in the {SID_NAME} departure. You can also simply',
                    'give a direct climb, lifting the restrictions on the SID. Feel free to click the speedup button on the right side of the ',
                    'input box (it\'s two small arrows) to watch the departure climb along the SID. Then just click it again to return to 1x speed.'
            ].join(' '),
            parse: (t) => {
                if (prop.aircraft.list.length <= 0) {
                    return t;
                }

                return t.replace('{CALLSIGN}', departureAircraft.callsign)
                        .replace('{INIT_ALT}', AirportController.airport_get().initial_alt)
                        .replace('{SID_NAME}', departureAircraft.destination);
            },
            side: 'left',
            position: tutorial_position
        });

        this.tutorial_step({
            title: 'Departures',
            text: ['If you zoom out and click on {CALLSIGN}, you will see a solid blue line that shows their flight plan',
                   'route. You will see the SID and some initial waypoints and airways represented by the blue line. To keep',
                   'traffic at a controllable rate, it is in your best interest to get them out of your airspace! To do this',
                   'you can issue the "pd" command (later on in this tutorial) to clear it to a fix and out of your airspace faster!'
            ].join(' '),
            parse: (t) => {
                if (prop.aircraft.list.length <= 0) {
                    return t;
                }

                return t.replace('{CALLSIGN}', departureAircraft.callsign);
            },
            side: 'left',
            position: tutorial_position
        });

        this.tutorial_step({
            title: 'Basic Control Instructions: Altitude',
            text: ['You can assign altitudes with the "climb" command, or any of its aliases (other words that',
                   'act identically). Running the command "climb" is the same as the commands "descend", "d",',
                   '"clear", "c", "altitude", or "a". Just use whichever feels correct in your situation.',
                   'Remember, just as in real ATC, altitudes are ALWAYS written in hundreds of feet, eg. "descend 30" for 3,000ft or "climb',
                   ' 100" for 10,000ft.'
            ].join(' '),
            side: 'left',
            position: tutorial_position
        });

        this.tutorial_step({
            title: 'Basic Control Instructions: Radar Vectors',
            text: ['Radar vectors are an air traffic controller\'s way of telling aircraft to fly a specific magnetic heading. We can give aircraft radar',
                   'vectors in three ways. Usually, you will use "t l ###" or "t r ###". Be careful, as it is both easy',
                   'and dangerous to give a turn in the wrong direction. If the heading is only slightly left or right, to avoid choosing the wrong direction,',
                   'you can tell them to "fly heading" by typing "fh ###", and the aircraft will simply turn the shortest direction',
                   'to face that heading. You can also instruct an aircraft to turn left and right by a given number of degrees if you give only a two-digit number.'
            ].join(' '),
            side: 'left',
            position: tutorial_position
        });

        this.tutorial_step({
            title: 'Basic Control Instructions: Speed',
            text: ['Speed control is a highly useful tool, especially when your airspace has restrictions that aircraft need to meet! Making good use of speed control can also help keep the',
                   'pace manageable and allow you to carefully squeeze aircraft closer and closer to minimums while still maintaining safety. To enter speed instructions, use the',
                   '"+" and "-" keys on the numpad or "sp", followed by the speed, in knots. Note that this assigned speed is indicated',
                   'airspeed, and our radar scope can only display groundspeed; so, the values may be different.'
            ].join(' '),
            side: 'left',
            position: tutorial_position
        });

        this.tutorial_step({
            title: 'Proceed Direct',
            text: ['The proceed direct command "pd" instructs an aircraft to go directly to a waypoint in the flight plan. For example, if an',
                   'aircraft is flying to fixes [A, B, C], issuing the command "pd B" will cause the aircraft to go to B, then C.'
            ].join(' '),
            side: 'left',
            position: tutorial_position
        });

        this.tutorial_step({
            title: 'Bon voyage, aircraft!',
            text: ['When the aircraft leaves your airspace, it will switch to center and',
                   'automatically remove itself from the flight strip bay on the right.',
                   'Congratulations, you\'ve successfully departed an aircraft.'
            ].join(' '),
            side: 'left',
            position: tutorial_position
        });

        this.tutorial_step({
            title: 'Arrivals',
            text: ['Now, onto arrivals. Click on any arriving aircraft in the radar screen; after you\'ve',
                   'selected it, use the altitude/heading/speed controls you\'ve learned in order to',
                   'guide it to the intercept of the ILS for the runway. The aircraft should be at an appropriate',
                   'altitude and flying an appropriate heading (more on this later) before you clear it for approach!'
            ].join(' '),
            side: 'left',
            position: tutorial_position
        });

        this.tutorial_step({
            title: 'Approach Clearances, part 1',
            text: ['You can clear aircraft for an ILS approach with the "i" command, followed by a runway name.',
                   'When you do so, the aircraft will attempt to intercept the localiser, represented by the',
                   'extended centerline. Try giving radar vectors to get the aircraft on an intercept of 30 degrees or less,',
                   'and then issue the instruction "i {RUNWAY}" to clear it for the ILS. It should then guide itself down',
                   'to the runway, managing its own altitiude and maintaining heading.'
            ].join(' '),
            parse: (t) => {
                // This isn't robust. If there are multiple runways in use, or the arrival a/c has filed to land
                // elsewhere then the tutorial message will not be correct. However, it's not a bad guess, and hopefully
                // the player hasn't dicked with it too much.
                return t.replace('{RUNWAY}', AirportController.airport_get().arrivalRunwayModel.name);
            },
            side: 'left',
            position: tutorial_position
        });

        this.tutorial_step({
            title: 'Approach Clearances, part 2',
            text: ['As said earlier, in the Arrivals page, before clearing the aircraft for the ILS, it should be at an appropriate',
                   'altitude and a heading of 30 degrees or less to intercept. For maximum realism, we recommend looking up the IAP',
                   'charts for the airport you are at, to find the intercept altitude and any other restrictions. You can find these',
                   'easily via a quick google search! :)'
            ].join(' '),
            side: 'left',
            position: tutorial_position
        });

        this.tutorial_step({
            title: 'Score',
            text: ['The lower-right corner of the page has a small number in it; this is your score.',
                   'Whenever you successfully route an aircraft to the ground or out of the screen, you earn points. As you make mistakes,',
                   'like directing aircraft to a runway with a strong crosswind/tailwind, losing separation between aircraft, or ignoring an',
                   'aircraft, you will also lose points. If you\'d like, you can just ignore the score; it doesn\'t have any effect',
                   'on the simulation.'
            ].join(' '),
            side: 'left',
            position: tutorial_position
        });

        this.tutorial_step({
            title: 'Some Tips, part 1',
            text: ['If you\'re interested in making your experience in the sim more realistic, a few topics you can check out are how to assign IFR',
                   'altitudes, how to differentiate and seperate aircraft in regards to wake turbulence and looking up airport charts for even more realistic',
                   'runway operations, and of course IAP charts for realistically routing arrivals for a correct ILS approach!'
            ].join(' '),
            side: 'left',
            position: tutorial_position
        });

        this.tutorial_step({
            title: 'Some Tips, part 2',
            text: ['You can also enter multiple commands together in one transmission, just like real life!',
                   'E.g. EZE2429 fh 270 d 30 - 180 i 26. A useful tool in this sim is the track measuring tool, hold',
                   'Ctrl and left click to drag the mouse from one point to another, which will show the distance in NM and',
                   'the magnetic bearing. Useful for when you need to mark distances or understand when to turn an aircarft.',
                   'Additionally, you can hold down Ctrl+Shift and left clcik, and your mouse will automatically snap to aircraft',
                   'and fixes. As well as displaying distance and bearing, it will also show the time the aircraft will take to reach',
                   'that point. Clicking again will keep the drawn line displayed (you can make multiple lines), and pressing Esc will',
                   'remove all lines. Be sure to also check out the in-game Airport Guides for some information that could come in hand! :)'
            ].join(' '),
            side: 'left',
            position: tutorial_position
        });

        this.tutorial_step({
            title: 'Good job!',
            text: ['If you\'ve gone through this entire tutorial, you should do pretty well with the pressure.',
                   'In the TRACON, minimum separation is 3 miles laterally or 1000 feet vertically. Keep them separated,',
                   'keep them moving, and you\'ll be a controller in no time!',
                   'A full list of commands can be found <a title="openScope Command Reference" href="https://github.com/openscope/openscope/blob/develop/documentation/commands.md" target="_blank">here</a>.'
            ].join(' '),
            side: 'left',
            position: tutorial_position
        });
    }

    /**
     * Open/close the tutorial modal
     *
     * This method may be triggered via `EventBus.trigger()`
     *
     * @for TutorialView
     * @method tutorial_toggle
     */
    tutorial_toggle() {
        if (this.isTutorialDialogOpen()) {
            this.tutorial_close();

            return;
        }

        this.tutorial_open();
    }

    /**
     * @method tutorial_get
     */
    tutorial_get(step = null) {
        if (!step) {
            step = this.tutorial.step;
        }

        return this.tutorial.steps[step];
    }

    /**
     * @method tutorial_move
     */
    tutorial_move() {
        const step = this.tutorial_get();
        const padding = [30, 10];
        const left = step.position[0] * ($(window).width() - this.$tutorialView.outerWidth() - padding[0]);
        let top = step.position[1] * ($(window).height());
        top -= (this.$tutorialView.outerHeight() - padding[1]);

    //  left += step.padding[0];
    //  top  += step.padding[1];

        this.$tutorialView.offset({
            top: round(top),
            left: round(left)
        });
    }

    /**
     * @method tutorial_step
     */
    tutorial_step(options) {
        this.tutorial.steps.push(new TutorialStep(options));
    }

    /**
     * @method tutorial_update_content
     */
    tutorial_update_content() {
        const step = this.tutorial_get();

        this.$tutorialView.find('h1').html(step.title);
        this.$tutorialView.find('main').html(step.getText());
        this.$tutorialView.removeClass('left right');

        if (step.side === SELECTORS.CLASSNAMES.LEFT) {
            this.$tutorialView.addClass(SELECTORS.CLASSNAMES.LEFT);
        } else if (step.side === SELECTORS.CLASSNAMES.RIGHT) {
            this.$tutorialView.addClass(SELECTORS.CLASSNAMES.RIGHT);
        }

        this.tutorial_move();
    }

    /**
     * @method tutorial_open
     */
    tutorial_open() {
        this.$tutorialView.addClass(SELECTORS.CLASSNAMES.OPEN);
        this.$toggleTutorial.addClass(SELECTORS.CLASSNAMES.ACTIVE);

        this.tutorial_update_content();
    }

    /**
     * @method tutorial_close
     */
    tutorial_close() {
        this.$tutorialView.removeClass(SELECTORS.CLASSNAMES.OPEN);
        this.$toggleTutorial.removeClass(SELECTORS.CLASSNAMES.ACTIVE);

        this.tutorial_move();
    }

    // TODO: this method never gets called anywhere else, remove
    /**
     * @method tutorial_complete
     */
    tutorial_complete() {
        if (!_has(localStorage, STORAGE_KEY.FIRST_RUN_TIME)) {
            this.tutorial_open();
        }

        localStorage[STORAGE_KEY.FIRST_RUN_TIME] = TimeKeeper.gameTimeInSeconds;
    }

    /**
     * @method tutorial_next
     */
    tutorial_next() {
        if (this.tutorial.step === this.tutorial.steps.length - 1) {
            this.tutorial_close();

            return;
        }

        this.tutorial.step = clamp(0, this.tutorial.step + 1, this.tutorial.steps.length - 1);

        EventTracker.recordEvent(TRACKABLE_EVENT.TUTORIAL, 'next', `${this.tutorial.step}`);
        this.tutorial_update_content();
    }

    /**
     * @method tutorial_prev
     */
    tutorial_prev() {
        this.tutorial.step = clamp(0, this.tutorial.step - 1, this.tutorial.steps.length - 1);

        EventTracker.recordEvent(TRACKABLE_EVENT.TUTORIAL, 'prev', `${this.tutorial.step}`);
        this.tutorial_update_content();
    }
}
