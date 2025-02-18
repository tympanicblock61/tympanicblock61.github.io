if (typeof window.commands == "undefined") {
    window.commands = {}
    window.commands.sendWarn = console.warn;
    window.commands.sendError = console.error;
    window.commands.sendOutput = console.log;
}

class CommandDispatcher {
    constructor(prefix) {
        this.prefix = prefix;
        this.root = new RootCommandNode();
        this.commands = [];
    }

    register(node) {
        this.root.addChild(node);
        if (node instanceof LiteralCommandNode) {
            this.commands.push(node.literal);
        }
    }

    dispatch(input) {
        if (!input.startsWith(this.prefix)) return;
        input = input.substring(this.prefix.length);
        const context = new CommandContext(input);
        if (!this.root.parse(context)) {
            window.commands.sendError(`Command not found or invalid usage: "${input}"`);
        }
    }

    getHelpString(command) {
        if (command) {
            const helpNode = this.root.findHelpNode(command);
            return helpNode
                ? helpNode.getHelpString("")
                : `No help available for "${command}"`;
        }
        return this.root.getHelpString("");
    }
}

class CommandNode {
    constructor() {
        this.children = [];
        this._executor = undefined;
        this._optional = false;
        this.description = "";
    }

    parse() {
        throw new Error("parse() must be implemented in subclass");
    }

    execute(executor) {
        this._executor = executor;
        return this;
    }

    addChild(node) {
        this.children.push(node);
        return this;
    }

    setOptional() {
        this._optional = true;
        return this;
    }

    setDescription(description) {
        this.description = description;
        return this;
    }

    isOptional() {
        return this._optional;
    }

    performExecution(context) {
        if (this._executor) {
            this._executor(context);
        }
    }

    getHelpString() {
        throw new Error("getHelpString() must be implemented in subclass");
    }

    findHelpNode(context) {
        for (const child of this.children) {
            const startPos = context.pos;
            if (child.parse(context)) {
                return child;
            }
            context.pos = startPos;
        }
        return null;
    }
}

class RootCommandNode extends CommandNode {
    parse(context) {
        for (const child of this.children) {
            if (child.parse(context)) {
                return true;
            }
        }
        return false;
    }

    getHelpString(indent) {
        let helpString = "";
        for (const child of this.children) {
            helpString += child.getHelpString(indent);
        }
        return helpString;
    }

    findHelpNode(literal) {
        for (const child of this.children) {
            if (child.literal === literal) {
                return child;
            }
        }
        return null;
    }
}

class LiteralCommandNode extends CommandNode {
    constructor(literal) {
        super();
        this.literal = literal;
    }

    parse(context) {
        const trimmedInput = context.input.substring(context.pos).trimStart();
        if (trimmedInput.startsWith(this.literal)) {
            context.pos += this.literal.length;
            if (context.pos >= context.input.length) {
                this.performExecution(context);
                return true;
            }

            for (const child of this.children) {
                if (child.parse(context)) {
                    return true;
                }
            }

            if (this._executor) {
                this.performExecution(context);
                return true;
            }
        }
        return false;
    }

    getHelpString(indent) {
        let helpString = `${indent}${this.literal}${this.description ? ` - ${this.description}` : ""}\n`;
        for (const child of this.children) {
            helpString += child.getHelpString(indent + "  ");
        }
        return helpString;
    }
}

class ArgumentCommandNode extends CommandNode {
    constructor(name, type) {
        super();
        this.name = name;
        this.type = type;
    }

    parse(context) {
        const startPos = context.pos;
        const value = this.type.parse(context);
        if (value !== undefined) {
            context.setArgument(this.name, value);
            let successfulParse = false;

            for (const child of this.children) {
                if (child.parse(context)) {
                    successfulParse = true;
                    break;
                }
            }

            if (!successfulParse && this._executor) {
                this.performExecution(context);
                return true;
            }
            return successfulParse;
        } else {
            context.pos = startPos;
            if (!this.isOptional()) {
                window.commands.sendError(`Missing required argument for "${this.name}"`);
            }
            return false;
        }
    }

    getHelpString(indent) {
        const optionalMarker = this.isOptional() ? " [optional]" : "";
        let helpString = `${indent}<${this.name}>${optionalMarker}${this.description ? ` - ${this.description}` : ""}\n`;
        for (const child of this.children) {
            helpString += child.getHelpString(indent + "  ");
        }
        return helpString;
    }
}

class IntegerArgumentType {
    parse(context) {
        const sub = context.input.substring(context.pos);
        const whiteSpace = sub.length - sub.trimStart().length;
        const match = sub.trimStart().match(/^\d+/);
        if (match) {
            const value = parseInt(match[0], 10);
            context.pos += match[0].length + whiteSpace;
            return value;
        }
        return undefined;
    }
}

class StringArgumentType {
    constructor(config = {}) {
        this.allows = config.allows || null;
        this.minLength = config.minLength || 0;
        this.maxLength = config.maxLength || Infinity;
    }

    parse(context) {
        const sub = context.input.substring(context.pos);
        const whiteSpace = sub.length - sub.trimStart().length;
        const match = sub.trimStart().match(/(?:"[^"]*\s[^"]*")|\S+/);
        if (match) {
            let value;
            if (match[0][0] == '"') {
                value = match[0].substring(1, match[0].length - 1);
            } else {
                value = match[0];
            }
            if (this.allows instanceof RegExp && !this.allows.test(value)) {
                window.commands.sendError(`Input does not match the allowed pattern "${this.allows}".`);
            } else if (Array.isArray(this.allows) && !this.allows.includes(value)) {
                window.commands.sendError(`string is not in the allowed list "${this.allows}".`);
            } else if (typeof this.allows === "function" && !this.allows(value)) {
                window.commands.sendError(`string is not allowed by allows function`);
            } else if (this.minLength > 0 && value.length < this.minLength) {
                window.commands.sendError(`string is too short. Minimum length is ${this.minLength}.`);
            } else if (value.length > this.maxLength) {
                window.commands.sendError(`string is too long. Maximum length is ${this.maxLength}.`);
            } else {
                context.pos += match[0].length + whiteSpace;
                return value;
            }
        }
        return undefined;
    }
}

class CommandContext {
    constructor(input) {
        this.input = input;
        this.pos = 0;
        this.arguments = new Map();
    }

    consume(literal) {
        const trimmedInput = this.input.substring(this.pos).trimStart();
        if (trimmedInput.startsWith(literal)) {
            this.pos += literal.length;
            return true;
        }
        return false;
    }

    setArgument(name, value) {
        this.arguments.set(name, value);
    }

    getArgument(name) {
        return this.arguments.get(name);
    }
}