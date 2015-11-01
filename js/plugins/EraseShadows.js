"use strict";
 
//=============================================================================
// TestPlugin.js
//=============================================================================
 
/*:
 * @plugindesc Test MV plugin
 */
 
{
  //
  // delete shadow data
  //
  let old_onLoad=DataManager.onLoad;
 
  DataManager.onLoad=function(object)
  {
          if (object===$dataMap) erase_shadows(object);
          old_onLoad.call(this, object);
  }
 
  let erase_shadows=function(map)
  {
          var cellcount=map.width*map.height, len=map.data.length;
          for (var i=len-cellcount*2; i<len-cellcount; i++)
          {
                  map.data[i]=0;
          }
  }
};