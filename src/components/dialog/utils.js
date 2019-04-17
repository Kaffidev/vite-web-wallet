
import Vue from 'vue';
import closeIcon from 'assets/imgs/confirm_close.svg';
const STATUS = {
    'CLOSE': 'CLOSE',
    'CANCEL': 'CANCEL',
    'CONFIRMED': 'CONFRIMED'
};

const mixin = {
    props: {
        showMask: {
            type: Boolean,
            default: false
        },
        title: {
            type: String,
            default: ''
        },
        showClose: {
            type: Boolean,
            default: true
        },
        lTxt: {
            type: String,
            default: ''
        },
        rTxt: {
            type: String,
            default: ''
        },
        sTxt: {
            type: String,
            default: ''
        },
        btnUnuse: {
            type: Boolean,
            default: false
        },
        showBottom: {
            type: Boolean,
            default: true
        },
        content: {
            type: String,
            default: ''
        },
        promise: {
            type: Object,
            default: () => null
        }
    },
    computed: {
        s() {
            return {
                container: { 'background': this.showMask ? 'rgba(0, 0, 0, 0.6)' : '--', position: 'fixed', top: 0, bottom: 0, right: 0, left: 0, overflow: 'auto', display: 'flex', 'justify-content': 'center', 'align-items': 'center', 'z-index': 100 },
                wrapper: { width: '90%', 'max-width': '515px', 'max-height': '85%', display: 'flex', 'flex-direction': 'column', background: '#ffffff', 'box-shadow': '0 2px 48px 1px rgba(176, 192, 237, 0.42)', 'border-radius': '2px', 'padding-bottom': '30px' },
                title: { background: '#268eff', height: '60px', 'line-height': '60px', 'padding-left': '30px', 'font-size': '16px', color: '#ffffff' },
                close: { 'box-sizing': 'border-box', display: 'block', float: 'right', padding: '30px', width: '20px', height: '20px', background: `url(${ closeIcon })`, 'background-repeat': 'no-repeat', 'background-position': 'center', 'background-size': '20px 20px' },
                body: { position: 'relative', 'box-sizing': 'border-box', padding: '30px', overflow: 'auto', 'font-size': '18px', color: '#1d2024', 'line-height': '26px' },
                btnGroup: { padding: '0 30px', display: 'flex', 'height': '40px', 'box-sizing': 'border-box', 'justify-content': 'space-between' },
                btn: { 'white-space': 'nowrap', color: '#ffffff', background: '#007AFF', 'flex-grow': 1 },
                left: { border: '1px solid #007aff', 'border-radius': '2px', color: '#007aff', 'margin-right': '20px' },
                unUse: { background: '#efefef', color: '#666' }
            };
        }
    },
    methods: {
        lClick() {
            if (this.inspector) {
                this.inspector.then(data => {
                    this.promise.resolve({
                        status: STATUS.CONFIRMED,
                        data
                    });
                });
            } else {
                this.promise.resolve({
                    status: STATUS.CONFIRMED,
                    data: null
                });
            }
            document.body.removeChild(this.$el);

            this.$destroy();
        },
        rClick() {
            this.promise.reject({
                status: STATUS.CANCEL,
                data: null
            });
            document.body.removeChild(this.$el);
            this.$destroy();
        },
        close() {
            this.promise.reject({
                status: STATUS.CLOSE,
                data: null
            });
            document.body.removeChild(this.$el);

            this.$destroy();
        }
    }
};

export default function (component, propsDefault = {}) {
    return function dialog(props = {}) {
        const insert = function (props) {
            component.mixins = component.mixins || [];
            component.mixins.push(mixin);
            const ConfirmComponent = Vue.extend(component);
            console.log(88888, props);
            const componentInstance = new ConfirmComponent({
                el: document.createElement('div'),
                propsData: props
            });
            document.body.appendChild(componentInstance.$el);
            return componentInstance.$el;
        };
        return new Promise(function (resolve, reject) {
            insert({ ...propsDefault, ...props, promise: { resolve, reject } });
        });
    };
}

