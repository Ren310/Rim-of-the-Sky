//=============================================================================
// EvilCatUtils.js
//=============================================================================

/*:
 * @plugindesc Some core functions used in EvilCat plugins.
 * @author EvilCat
 * @email soevilcat@mail.ru
 * @help
 * This plugins is intended to easy some of scripting needs.
 * Please refer to code comments.
 * Creative Commons 3.0 Attribution license
 */

"use strict";

var EvilCat = {};

{
	/*
		A class for handling singleton plugin objects.
		Usage:
		
		var <some_var> = function <plugin_name> {
			// JS constructor notation here
		}
		<some_var>.prototype = Object.create(EvilCat.Plugin.prototype);
		<some_var>.prototype.constructor = <some_var>;
		
		OR
		
		var <some_var> = class <plugin_name> extends EvilCat.Plugin {
			// JS6 class notation here
		}
		
		THEN
		
		var <plugin_var> = new <some_var>; // the class is singleton, meaning it has only one instance; we create it now.
	*/
	EvilCat.Plugin=class Plugin
	{
		// don't forget to call parent's constructor when inheriting from this class! use either:
		// EvilCat.Plugin.apply(this, arguments);
		// OR
		// super(arg1, arg2...); // in JS6 class notation
		// note that constructor (or class definition for JS6 way) should have a name!
		constructor(name)
		{
			this.name=this.constructor.name;
			if (!this.name) throw new Error('Plugin constructor should have a name!');
			else if (EvilCat.Plugins[this.name]) throw new Error('Duplicate plugin!');
			EvilCat.Plugins[this.name]=this;
			
			this.makeCommandsList();
			
			this.parsedParams={};
		}
		
		// overload this method to append string names of methods that are valid as Plugin Commands. For example:
		// makeCommandsList() { this.validCommands=['loadEvent']; }		
		// methods listed here are called with Game_Event object as first arguments, then all other Plugin Command arguments.
		makeCommandsList() { this.validCommands=[]; }
		
		_eventCommand(interpreter, args)
		{
			var command_method=this._getCommandMethod(args[0]);
			if (!command_method) throw new Error('unknown command '+args[0]);
			var plugin_args=args.slice(1);
			plugin_args.unshift($gameMap.event(interpreter.eventId()));
			command_method.apply(this, plugin_args);
		}
		
		_getCommandMethod(command)
		{
			var ind=this.validCommands.indexOf(command);
			if (ind==-1) return;
			if (!this[command] || !(this[command] instanceof Function)) throw new Error('bad plugin command');
			return this[command];
		}
		
		// returns raw plugin's parameters
		parameters()
		{
			if (!this._paramaters) this._parameters=PluginManager.parameters(this.name);
			return this._parameters;
		}
		
		// returns plugin's parameter converted to the type
		// type should be 'Bool', 'Int', 'Float', 'String', 'Color' or a parser method (see below)
		parameter(name, type, by_default)
		{
			if (this.parsedParams.hasOwnProperty(name)) return this.parsedParams[name];
			
			var parameters=this.parameters();
			if (!parameters.hasOwnProperty(name))
			{
				if (by_default===undefined) throw new Error('Required param: '+name);
				return this.parsedParams[name]=by_default;
			}
			
			var param=parameters[name];
			if (type) return this._parseParam(param, type, name);
			else return this.parsedParams[name]=param;
		}
		paramBool	(name, by_default)	{ return this.parameter(name, 'Bool',	by_default); }
		paramInt	(name, by_default)	{ return this.parameter(name, 'Int',	by_default); }
		paramFloat	(name, by_default)	{ return this.parameter(name, 'Float',	by_default); }
		paramString	(name, by_default)	{ return this.parameter(name, 'String',	by_default); }
		paramColor	(name, by_default)	{ return this.parameter(name, 'Color',	by_default); }
		
		_parseParam(param, type, name)
		{
			var method=this.static._parserByName(type);
			if (!method) throw new Error('no parse method for '+type);
			var parsed=method(param);
			if (name!==undefined) this.parsedParams[name]=parsed;
			return parsed;
		}
		
		get static() { return this.constructor; }
		// for code clarity, such as WebLoadPlugin.static.parseURL, instead of WebLoadPlugin.constructor.parseURL.
		
		static _parserByName(parser_name, plugin)
		{
			var method='parse'+parser_name;
			if (!plugin) plugin = this || EvilCat.Plugin;
			if (!plugin[method]) return undefined;
			return plugin[method];
		}
		
		// parsers are intended also to be used independently for conversion of meta data.
		static parseBool(param)
		{
			if (param===true || param===false) return param;
			param=param.toLowerCase().trim();
			if (param==='true'  || param==='y' || param==='yes' || param==='on'  || param==='1') return true;
			if (param==='false' || param==='n' || param==='no'  || param==='off' || param==='0') return false;
			throw new Error('unknown boolean value: '+param);
		}
		
		static parseInt(param)
		{
			if (Number.isInteger(param)) return param;
			return Math.floor(Number(param));
		}
		
		static parseFloat(param)
		{
			if (Number.isFinite(param)) return param;
			return Number(param);
		}
		
		static parseString(param)
		{
			if (typeof param === 'string') return param;
			return String(param);
		}
		
		static parseColor(param)
		{
			if (param instanceof EvilCat.Color) return param;
			return EvilCat.Color.parse(param);
		}
	}
	EvilCat.Plugins={};
	
	let _Game_Interpreter_pluginCommand=Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args)
	{
		if (EvilCat.Plugins[command]) EvilCat.Plugins[command]._eventCommand(this, args);
        else _Game_Interpreter_pluginCommand.call(this, command, args);
    };
	
	// A simple class to handle color transformations.
	EvilCat.Color=class Color
	{
		constructor(r, g, b)
		{
			this.r=Math.floor(r);
			this.g=Math.floor(g);
			this.b=Math.floor(b);
		}
		
		static parse(input) { return Color.create_from_hex(Number(input)); }
		
		static create_from_hex(hex)
		{
			return new Color(
				hex % 0x100,
				Math.floor(hex/0x100) % 0x100,
				Math.floor(hex/0x10000)
			);
		}

		merge_with_color(other_color, value)
		{
			return new Color(
				this.r+(other_color.r-this.r)*value,
				this.g+(other_color.g-this.g)*value,
				this.b+(other_color.b-this.b)*value
			);
		}
		
		merge_with_white(value) { return this.merge_with_color(Color.create_from_hex(0xFFFFFF), value); }
		
		to_hex()
		{
			return this.r+this.g*0x100+this.b*0x10000;
		}
	}
	
	// this section adds getMeta to many all (hopefully) classes that have respective meta.
	
	let extractFromMeta=function(meta, param, parser, by_default)
	{
		if (!meta) return undefined;
		if (param===undefined) return meta;
		
		var value;
		if (!meta.hasOwnProperty(param)) return by_default;
		value=meta[param];
		if (parser)
		{
			if (typeof parser === 'string')
			{
				parser=EvilCat.Plugin._parserByName(parser);
				if (!parser) throw new Error('Bad parser name!');
			}
			value=parser(value);
		}
		return value;
	}
	
	let getMeta=function(param, parser, by_default)
	{
		var meta;
		if (this._getMetaData) meta=this._getMetaData();
		else if (this.meta) meta=this.meta;
		else return by_default;
		return extractFromMeta(meta, param, parser, by_default);
	}
	
	Game_Actor.prototype.getMeta=getMeta;
	
	Game_Map.prototype.getMeta=getMeta;
	Game_Map.prototype._getMetaData=function()
	{
		return $dataMap.meta;
	}
	
	Game_Player.prototype.getMeta=getMeta;
	Game_Player.prototype._getMetaData=function()
	{
		var actor=$gameParty.leader();
		if (actor) return actor.actor().meta;
		else return undefined;
	}
	
	Game_Follower.prototype.getMeta=getMeta;
	Game_Follower.prototype._getMetaData=function()
	{
		var actor=this.actor();
		if (actor) return actor.actor().meta;
		else return undefined;
	}
	
	Game_Event.prototype.getMeta=getMeta;
	Game_Event.prototype._getMetaData=function()
	{
		// metadata is not page-specific presently and can't be changed by page flipping.
		return this.event().meta;
	}
	
}