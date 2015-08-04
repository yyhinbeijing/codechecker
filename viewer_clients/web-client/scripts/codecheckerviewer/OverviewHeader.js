// -------------------------------------------------------------------------
//                     The CodeChecker Infrastructure
//   This file is distributed under the University of Illinois Open Source
//   License. See LICENSE.TXT for details.
// -------------------------------------------------------------------------

define([
  "dojo/_base/declare",
  "dijit/layout/ContentPane",
  "scripts/codecheckerviewer/widgets/Filter.js",
], function ( declare, ContentPane, Filter ) {
return declare(ContentPane, {

  // myOverviewTC


  constructor : function(args) {
    var that = this;
    declare.safeMixin(that, args);


    that.filters = [];
  },



  postCreate : function() {
    var that = this;
    that.inherited(arguments);


    that.mainFilter = new Filter({
      myOverviewTC : that.myOverviewTC
    });

    that.mainFilter.addPlusButton();

    that.filters.push(that.mainFilter);

    that.addChild(that.mainFilter);
  },



  getStateOfFilters : function() {
    var that = this;


    var filterObjArray = [];

    for (var i = 0 ; i < that.filters.length ; ++i) {

      var supprState       = that.filters[i].selectSuppr.getValue();
      var severityState    = that.filters[i].selectSeverity.getValue();
      var pathState        = that.filters[i].textBoxPath.getValue();
      var checkerTypeState = that.filters[i].selectCheckerType.getValue();

      if (that.overviewType === 'run') {
        filterObjArray.push({
          supprState      : supprState,
          severityState   : severityState,
          pathState       : pathState,
          checkerTypeState: checkerTypeState
        });
      } else if (that.overviewType === 'diff') {
        var resolvState = that.filters[i].selectResolv.getValue();
        filterObjArray.push({
          supprState      : supprState,
          resolvState     : resolvState,
          severityState   : severityState,
          pathState       : pathState,
          checkerTypeState: checkerTypeState
        })
      }

    }

    return filterObjArray;
  },



  addFilter : function() {
    var that = this;


    var newFilter = new Filter({
      myOverviewTC : that.myOverviewTC
    });

    newFilter.addPlusButton();
    newFilter.addMinusButton();

    var lastFilter = that.filters[that.filters.length-1];

    lastFilter.removePlusButton();

    if (lastFilter.minusButton !== undefined) { lastFilter.removeMinusButton(); }

    that.filters.push(newFilter);

    that.addChild(newFilter);

    that.onRemoveOrAdd();
    that.myOverviewTC.overviewBC.resize();
  },



  removeFilter : function(filter) {
    var that = this;


    var lastFilter = that.filters.pop();

    that.removeChild(lastFilter);

    lastFilter = that.filters[that.filters.length - 1];

    lastFilter.addPlusButton();

    if (lastFilter !== that.mainFilter) { lastFilter.addMinusButton(); }

    that.onRemoveOrAdd();
    that.myOverviewTC.overviewBC.resize();
  },



  onRemoveOrAdd : function() {
    var that = this;

    if (that.myOverviewTC.overviewType === "run") {
      that.myOverviewTC.overviewPager.refreshPager();
    } else if (that.myOverviewTC.overviewType === "diff") {
      that.myOverviewTC.overviewGrid.refreshGrid();
    }
  }




});});