var TextDiffBinding = require('text-diff-binding');

module.exports = ShareDBCodeMirror;

function ShareDBCodeMirror(codemirror, doc, path) {
    TextDiffBinding.call(this, codemirror);
    this.codemirror = codemirror;
    this.doc = doc;
    this.path = path || [];
    this._opListener = null;
    this._inputListener = null;
}

ShareDBCodeMirror.prototype = Object.create(TextDiffBinding.prototype);
ShareDBCodeMirror.prototype.constructor = ShareDBCodeMirror;

ShareDBCodeMirror.prototype.setup = function() {
    this.update();
    this.attachDoc();
    this.attachElement();
};

ShareDBCodeMirror.prototype.destroy = function() {
    this.detachElement();
    this.detachDoc();
};

ShareDBCodeMirror.prototype.attachElement = function() {
    var binding = this;
    this._inputListener = function() {
        binding.onInput();
    };

    this.codemirror.on('change', this._inputListener, false);

};

ShareDBCodeMirror.prototype.detachElement = function() {
    this.codemirror.off('change', this._inputListener, false);
};

ShareDBCodeMirror.prototype.attachDoc = function() {
    var binding = this;
    this._opListener = function(op, source) {
        binding._onOp(op, source);
    };
    this.doc.on('op', this._opListener);
};

ShareDBCodeMirror.prototype.detachDoc = function() {
    this.doc.removeListener('op', this._opListener);
};

ShareDBCodeMirror.prototype._onOp = function(op, source) {
    if (source === this) return;
    if (op.length === 0) return;
    if (op.length > 1) {
        throw new Error('Op with multiple components emitted');
    }
    var component = op[0];
    if (isSubpath(this.path, component.p)) {
        this._parseInsertOp(component);
        this._parseRemoveOp(component);
    } else if (isSubpath(component.p, this.path)) {
        this._parseParentOp();
    }
};

ShareDBCodeMirror.prototype._parseInsertOp = function(component) {
    if (!component.si) return;
    var index = component.p[component.p.length - 1];
    var length = component.si.length;
    this.onInsert(index, length);
};

ShareDBCodeMirror.prototype._parseRemoveOp = function(component) {
    if (!component.sd) return;
    var index = component.p[component.p.length - 1];
    var length = component.sd.length;
    this.onRemove(index, length);

};

ShareDBCodeMirror.prototype._parseParentOp = function() {
    this.update();
};

ShareDBCodeMirror.prototype._get = function() {
    var value = this.doc.data;
    for (var i = 0; i < this.path.length; i++) {
        var segment = this.path[i];
        value = value[segment];
    }
    return value;
};

ShareDBCodeMirror.prototype._insert = function(index, text) {
    var path = this.path.concat(index);
    var op = {p: path, si: text};
    this.doc.submitOp(op, {source: this});
};

ShareDBCodeMirror.prototype._remove = function(index, text) {
    var path = this.path.concat(index);
    var op = {p: path, sd: text};
    this.doc.submitOp(op, {source: this});
};

function isSubpath(path, testPath) {
    for (var i = 0; i < path.length; i++) {
        if (testPath[i] !== path[i]) return false;
    }
    return true;
}