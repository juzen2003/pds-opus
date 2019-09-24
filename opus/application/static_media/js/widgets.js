/* jshint esversion: 6 */
/* jshint bitwise: true, curly: true, freeze: true, futurehostile: true */
/* jshint latedef: true, leanswitch: true, noarg: true, nocomma: true */
/* jshint nonbsp: true, nonew: true */
/* jshint varstmt: true */
/* jshint multistr: true */
/* globals $ */
/* globals o_hash, o_menu, o_search, o_utils, opus */

/* jshint varstmt: false */
var o_widgets = {
/* jshint varstmt: true */

    /**
     *
     *  Getting and manipulating widgets on the search tab
     *
     **/

    lastStringSearchRequestNo: 0,
    // Use to make sure ranges dropdown is not closed by default or manually when it's set to true.
    isKeepingRangesDropdownOpen: false,

    addWidgetBehaviors: function() {
        $("#op-search-widgets").sortable({
            items: "> li",
            cursor: "move",
            // we need the clone so that widgets in url gets changed only when sorting is stopped
            helper: "clone",
            scrollSensitivity: 100,
            axis: "y",
            opacity: 0.8,
            cursorAt: {top: 10, left: 10},
            stop: function(event, ui) {
                o_widgets.widgetDrop(this);
            },
        });

        $("#op-search-widgets").on( "sortchange", function(event, ui) {
            o_widgets.widgetDrop();
        });

        // click the dictionary icon, the definition slides open
        $('#search').on('click', 'a.dict_link', function() {
            $(this).parent().parent().find('.dictionary').slideToggle();
            return false;
        });

        // open/close mult groupings in widgets
        $('#search').on('click', '.mult_group_label_container', function() {
            $(this).find('.indicator').toggleClass('fa-plus');
            $(this).find('.indicator').toggleClass('fa-minus');
            $(this).next().slideToggle("fast");
        });

        // close a card
        $('#search').on('click', '.close_card', function(myevent) {
            let slug = $(this).data('slug');
            o_widgets.closeWidget(slug);
            let id = "#widget__"+slug;
            try {
                $(id).remove();
            } catch (e) {
                console.log("error on close widget, id="+id);
            }
        });

        // close opened surfacegeo widget if user select another surfacegeo target
        $('#search').on('change', 'input.singlechoice', function() {
            $('a[data-slug^="SURFACEGEO"]').each( function(index) {
                let slug = $(this).data('slug');
                o_widgets.closeWidget(slug);
                let id = "#widget__"+slug;
                try {
                    $(id).remove();
                } catch (e) {
                    console.log("error on close widget, id="+id);
                }
            });
        });

        // When user selects a ranges info item, update input fields and opus.selections
        // before triggering the search.
        $("#search").on("click", ".op-preprogrammed-ranges-data-item", function(e) {
            let minVal = $(e.currentTarget).data("min");
            let maxVal = $(e.currentTarget).data("max");
            let widgetId = $(e.currentTarget).data("widget");

            // NOTE: We need support both RANGE & STRING inputs, for now we implement RANGE first.
            if ($(`#${widgetId} input.RANGE`).length !== 0) {
                o_widgets.fillRangesInputs(widgetId, maxVal, minVal);
                // close dropdown and trigger the search
                $(`#${widgetId} input.op-range-input-min`).dropdown("toggle");
                $(`#${widgetId} input.RANGE`).trigger("change");
            }
        });

        o_widgets.addPreprogrammedRangesBehaviors();
    },

    addPreprogrammedRangesBehaviors: function() {
        /**
         * Add customized event handlers for the general behaviors of preprogrammed ranges
         * dropdown and expandable list. This function will be called in getWidget.
         */

        // Expand/collapse info when clicking a dropdown submenu
        $("#search").on("click", ".op-scrollable-menu .dropdown-item", function(e) {
            // prevent URL being messed up with href in <a>
            e.preventDefault();
            let collapsibleID = $(e.target).attr("href");
            $(`${collapsibleID}`).collapse("toggle");
            console.log(`Toggling ${collapsibleID}`);
            console.log($(`${collapsibleID}`));
        });

        // Avoid closing dropdown menu when clicking any dropdown item
        $("#search").on("click", ".op-scrollable-menu", function(e) {
            e.stopPropagation();
        });

        // Make sure expanded contents are collapsed when ranges dropdown list is closed.
        $("#search").on("hidden.bs.dropdown", function(e) {
            $(".op-preprogrammed-ranges .container").collapse("hide");
        });

        // Prevent dropdown from closing when clicking on the focused input again
        $("#search").on("mousedown", "input.op-range-input-min", function(e) {
            if ($(".op-scrollable-menu").hasClass("show") && $(e.target).is(":focus")) {
                o_widgets.isKeepingRangesDropdownOpen = true;
            }
        });

        $("#search").on("hide.bs.dropdown", function(e) {
            if (o_widgets.isKeepingRangesDropdownOpen) {
                e.preventDefault();
                o_widgets.isKeepingRangesDropdownOpen = false;
            }
        });
    },

    fillRangesInputs: function(widgetId, maxVal, minVal) {
        /**
         * Fill both ranges inputs with values passed in to the function.
         */
        let minInput = $(`#${widgetId} input.op-range-input-min`);
        let maxInput = $(`#${widgetId} input.op-range-input-max`);
        let slug = minInput.attr("name");

        if (minVal) {
            minInput.val(minVal);
            opus.selections[slug] = [minVal];
        } else {
            minInput.val("");
            delete opus.selections[slug];
        }

        slug = maxInput.attr("name");
        if (maxVal) {
            maxInput.val(maxVal);
            opus.selections[slug] = [maxVal];
        } else {
            maxInput.val("");
            delete opus.selections[slug];
        }
    },

    closeWidget: function(slug) {

        let slugNoNum;
        try {
            slugNoNum = slug.match(/(.*)[1|2]/)[1];
        } catch (e) {
            slugNoNum = slug;
        }

        if ($.inArray(slug,opus.prefs.widgets) > -1) {
            opus.prefs.widgets.splice(opus.prefs.widgets.indexOf(slug), 1);
        }

        if ($.inArray(slug,opus.widgetsDrawn) > -1) {
            opus.widgetsDrawn.splice(opus.widgetsDrawn.indexOf(slug), 1);
        }

        if ($.inArray(slug, opus.widgetElementsDrawn) > -1) {
            opus.widgetElementsDrawn.splice(opus.widgetElementsDrawn.indexOf(slug), 1);
        }

        if (slug in opus.selections) {
            delete opus.selections[slug];
        }
        // handle for range queries
        if (slugNoNum + '1' in opus.selections) {
            delete opus.selections[slugNoNum + '1'];
        }
        if (slugNoNum + '2' in opus.selections) {
            delete opus.selections[slugNoNum + '2'];
        }

        delete opus.extras[`qtype-${slugNoNum}`];
        delete opus.extras[`z-${slugNoNum}`];

        let selector = `li [data-slug='${slug}']`;
        o_menu.markMenuItem(selector, "unselect");

        o_search.allNormalizedApiCall().then(function(normalizedData) {
            if (normalizedData.reqno < opus.lastAllNormalizeRequestNo) {
                return;
            }
            o_search.validateRangeInput(normalizedData);

            if (opus.allInputsValid) {
                $("input.RANGE").removeClass("search_input_valid");
                $("input.RANGE").removeClass("search_input_invalid");
                $("input.RANGE").addClass("search_input_original");
                $("#sidebar").removeClass("search_overlay");
                $("#op-result-count").text(o_utils.addCommas(o_browse.totalObsCount));
                if (o_utils.areObjectsEqual(opus.selections, opus.lastSelections))  {
                    // Put back normal hinting info
                    opus.widgetsDrawn.forEach(function(eachSlug) {
                        o_search.getHinting(eachSlug);
                    });
                }
                $(".op-browse-tab").removeClass("op-disabled-nav-link");
            } else {
                $(".op-browse-tab").addClass("op-disabled-nav-link");
            }

            o_hash.updateHash(opus.allInputsValid);
            o_widgets.updateWidgetCookies();
        });
    },

    widgetDrop: function(obj) {
            // if widget is moved to a different formscolumn,
            // redefine the opus.prefs.widgets (preserves order)
            let widgets = $('#op-search-widgets').sortable('toArray');
            $.each(widgets, function(index,value) {
                widgets[index]=value.split('__')[1];
            });
            opus.prefs.widgets = widgets;

            o_hash.updateHash();

            o_widgets.updateWidgetCookies();
    },

    // this is called after a widget is drawn
    customWidgetBehaviors: function(slug) {
        switch(slug) {

            // planet checkboxes open target groupings:
            case 'planet':
                // user checks a planet box - open the corresponding target group
                // adding a behavior: checking a planet box opens the corresponding targets
                $('#search').on('change', '#widget__planet input:checkbox:checked', function() {
                    // a planet is .chosen_columns, and its corresponding target is not already open
                    let mult_id = '.mult_group_' + $(this).attr('value');
                    $(mult_id).find('.indicator').addClass('fa-minus');
                    $(mult_id).find('.indicator').removeClass('fa-plus');
                    $(mult_id).next().slideDown("fast");
                });
                break;

            case 'target':
                // when target widget is drawn, look for any checked planets:
                // usually for when a planet checkbox is checked on page load
                $('#widget__planet input:checkbox:checked', '#search').each(function() {
                    if ($(this).attr('id') && $(this).attr('id').split('_')[0] == 'planet') { // confine to param/vals - not other input controls
                        let mult_id = '.mult_group_' + $(this).attr('value');
                        $(mult_id).find('.indicator').addClass('fa-minus');
                        $(mult_id).find('.indicator').removeClass('fa-plus');
                        $(mult_id).next().slideDown("fast");
                    }
                });
                break;

            case 'surfacegeometrytargetname':
               // when target widget is drawn, look for any checked planets:
               // usually for when a planet checkbox is checked on page load
               $('#widget__planet input:checkbox:checked', '#search').each(function() {
                   if ($(this).attr('id') && $(this).attr('id').split('_')[0] == 'planet') { // confine to param/vals - not other input controls
                       let mult_id = '.mult_group_' + $(this).attr('value');
                       $(mult_id).find('.indicator').addClass('fa-minus');
                       $(mult_id).find('.indicator').removeClass('fa-plus');
                       $(mult_id).next().slideDown("fast");
                   }
               });
               break;
           //

        }
    },

    // adjusts the widths of the widgets in the main column so they fit users screen size
    adjustWidgetWidth: function(widget) {
        $(widget).animate({width:$('#op-search-widgets').width() - 2*20 + 'px'},'fast');  // 20px is the side margin of .widget
    },

    maximizeWidget: function(slug, widget) {
        // un-minimize widget ... maximize widget
        $('.minimize_widget', '#' + widget).toggleClass('opened_triangle');
        $('.minimize_widget', '#' + widget).toggleClass('closed_triangle');
        $('#widget_control_' + slug + ' .remove_widget').show();
        $('#widget_control_' + slug + ' .divider').show();
        $('#' + widget + ' .widget_minimized').hide();
        $('#widget_control_' + slug).removeClass('widget_controls_minimized');
        $('#' + widget + ' .widget_inner').show("blind");
        $('.ui-resizable-handle').show();
    },


    minimizeWidget: function(slug, widget) {
        // the minimized text version of the contstrained param = like "planet=Saturn"
        $('.minimize_widget', '#' + widget).toggleClass('opened_triangle');
        $('.minimize_widget', '#' + widget).toggleClass('closed_triangle');

        $('#widget_control_' + slug + ' .remove_widget').hide();
        $('#widget_control_' + slug + ' .divider').hide();

        let simple = o_widgets.minimizeWidgetLabel(slug);
        function doit() { // XXX WHY IS THIS A FUNCTION?
            $('#' + widget + ' .widget_inner').hide();

            $('#' + widget).animate({height:'1.2em'}, 'fast');
            $('#' + widget + ' .widget_minimized').html(simple).fadeIn("fast");
            $('#widget_control_' + slug).addClass('widget_controls_minimized');

            $('.ui-resizable-handle','#'+widget).hide();

        }
        doit();
    },

    // the string that shows when a widget is minimized
    minimizeWidgetLabel: function(slug) {
        // XXX This entire function needs review and help
        let label;
        let simple;
         try {
             label = $('#widget__' + slug + ' h2.widget_label').html();
         } catch(e) {
             label = slug;
         }

         let slugMin = false;
         let slugMax = false;
         let slugNoNum = false;
         if (slug.match(/.*(1|2)/)) {
             slugNoNum = slug.match(/(.*)[1|2]/)[1];
             slugMin = slugNoNum + '1';
             slugMax = slugNoNum + '2';
         }

         if (opus.selections[slug]) {

             let form_type = $('#widget__' + slug + ' .widget_inner').attr("class").split(' ')[1];

             if (form_type == 'RANGE') {

                 // this is a range widget
                 let qtypes;
                 try {
                     qtypes = opus.extras['qtype-' + slugNoNum];
                 } catch(e) {
                     qtypes = [opus.qtypeRangeDefault];
                 }

                 let length = (opus.selections[slugMin].length > opus.selections[slugMax].length) ? opus.selections[slugMin].length : opus.selections[slugMax].length;

                 simple = [];
                 for (let i=0;i<length;i++) {
                     // ouch:
                     let qtype;
                     try{
                         qtype = qtypes[i];
                     } catch(e) {
                         try {
                             qtype = qtypes[0];
                         } catch(e) {
                             qtype = opus.qtypeRangeDefault;
                         }
                     }

                     switch(qtype) {
                          case 'only':
                              simple[simple.length] = ' min >= ' + opus.selections[slugMin][i] + ', ' +
                                                      ' max <= ' + opus.selections[slugMax][i];
                              break;

                          case 'all':
                              simple[simple.length] = ' min <= ' + opus.selections[slugMin][i] + ', ' +
                                                      ' max  >= ' + opus.selections[slugMax][i];
                              break;

                          default:
                              simple[simple.length] = ' min  <= ' + opus.selections[slugMax][i] + ', ' +
                                                      ' max  >= ' + opus.selections[slugMin][i];
                      }

                      break;  // we have decided to only show the first range in the minimized display
                  }
                  simple = label + simple.join(' and ');
                  if (length > 1) {
                      simple = simple + ' and more..';
                  }

             } else if (form_type == 'STRING') {
                 let s_arr = [];
                 let last_qtype = '';
                 for (let key in opus.selections[slug]) {
                     let value = opus.selections[slug][key];
                     let qtype;
                     try {
                         qtype = opus.extras['qtype-'+slug][key];
                     } catch(err) {
                         qtype = opus.qtypeStringDefault;
                     }
                     if (key==0) {
                         s_arr[s_arr.length] = label + " " + qtype + ": " + value;
                     } else {
                         if (last_qtype && qtype == last_qtype) {
                             s_arr[s_arr.length] = value;
                         } else {
                             s_arr[s_arr.length] = qtype + ": " + value;
                         }
                     }
                     last_qtype = qtype;
                 }
                 simple = s_arr.join(' or ');


             } else {
                 // this is not a range widget
                 simple = label + ' = ' + opus.selections[slug].join(', ');
             }
         } else {
             simple = label + ' not constrained';
         }
         return simple;
     },

     updateWidgetCookies: function() {
         $.cookie("widgets", opus.prefs.widgets.join(','), { expires: 28});  // days
      },

     placeWidgetContainers: function() {
         // this is for when you are first drawing the browse tab and there
         // multiple widgets being requested at once and we want to preserve their order
         // and avoid race conditions that will throw them out of order
         for (let k in opus.prefs.widgets) {
             let slug = opus.prefs.widgets[k];
             let widget = 'widget__' + slug;
             let html = '<li id="' + widget + '" class="widget"></li>';
             $(html).appendTo('#op-search-widgets ');
             // $(html).hide().appendTo('#op-search-widgets').show("blind",{direction: "vertical" },200);
             opus.widgetElementsDrawn.push(slug);
         }
     },

     // adds a widget and its behaviors, adjusts the opus.prefs variable to include this widget, will not update the hash
    getWidget: function(slug, formscolumn) {

        if (!slug) {
            return;
        }

        if ($.inArray(slug, opus.widgetsDrawn) > -1) {
            return; // widget already drawn
        }
        if ($.inArray(slug, opus.widgetsFetching) > -1) {
            return; // widget being fetched
        }

        let widget = 'widget__' + slug;

        opus.widgetsFetching.push(slug);

        // add the div that will hold the widget
        if ($.inArray(slug, opus.widgetElementsDrawn) < 0) {
            opus.prefs.widgets.unshift(slug);

            o_widgets.updateWidgetCookies();
            // these sometimes get drawn on page load by placeWidgetContainers, but not this time:
            let html = '<li id="' + widget + '" class="widget"></li>';
            $(html).hide().prependTo(formscolumn).show("slow");
            opus.widgetElementsDrawn.unshift(slug);

        }
        $.ajax({
            url: "/opus/__forms/widget/" + slug + '.html?' + o_hash.getHash(),
            success: function(widget_str) {
                $("#widget__"+slug).html(widget_str);
            }
        }).done(function() {
            // If there is no specified qtype in the url, we want default qtype to be in the url
            // This will also put qtype in the url when a widget with qtype is open.
            // Need to wait until api return to determine if the widget has qtype selections
            let hash = o_hash.getHashArray();
            let qtype = "qtype-" + slug;

            if ($(`#widget__${slug} select[name="${qtype}"]`).length !== 0) {
                let qtypeValue = $(`#widget__${slug} select[name="${qtype}"] option:selected`).val();
                if (qtypeValue === "any" || qtypeValue === "all" || qtypeValue === "only") {
                    let helpIcon = '<li class="op-range-qtype-helper">\
                                    <a class="text-dark" tabindex="0" data-toggle="popover" data-placement="left">\
                                    <i class="fas fa-info-circle"></i></a></li>';

                    // Make sure help icon is attached to the end of each set of inputs
                    $(`#widget__${slug} .widget-main .op-range-input ul`).append(helpIcon);
                }

                if (!hash[qtype]) {
                    // When a widget with qtype is open, the value of the first option tag is the
                    // default value for qtype
                    let defaultOption = $(`#widget__${slug} select[name="${qtype}"]`).first("option").val();
                    opus.extras[qtype] = [defaultOption];
                    o_hash.updateHash();
                }
            }

            // Initialize popover, this for the (i) icon next to qtype
            $(".widget-main .op-range-qtype-helper a").popover({
                html: true,
                container: "body",
                trigger: "hover",
                content: function() {
                    return $("#op-qtype-tooltip").html();
                }
            });

            // If we have a string input widget open, initialize autocomplete for string input
            let displayDropDownList = true;
            let stringInputDropDown = $(`input[name="${slug}"].STRING`).autocomplete({
                minLength: 1,
                source: function(request, response) {
                    let currentValue = request.term;
                    let values = [];

                    o_widgets.lastStringSearchRequestNo++;
                    o_search.slugStringSearchChoicesReqno[slug] = o_widgets.lastStringSearchRequestNo;

                    values.push(currentValue);
                    opus.selections[slug] = values;
                    let newHash = o_hash.updateHash(false);
                    /*
                    We are relying on URL order now to parse and get slugs before "&view" in the URL
                    Opus will rewrite the URL when a URL is pasted, all the search related slugs would be moved ahead of "&view"
                    Refer to hash.js getSelectionsFromHash and updateHash functions
                    */
                    let regexForHashWithSearchParams = /(.*)&view/;
                    if (newHash.match(regexForHashWithSearchParams)) {
                        newHash = newHash.match(regexForHashWithSearchParams)[1];
                    }
                    // Avoid calling api when some inputs are not valid
                    if (!opus.allInputsValid) {
                        return;
                    }
                    let url = `/opus/__api/stringsearchchoices/${slug}.json?` + newHash + "&reqno=" + o_widgets.lastStringSearchRequestNo;
                    $.getJSON(url, function(stringSearchChoicesData) {
                        if (stringSearchChoicesData.reqno < o_search.slugStringSearchChoicesReqno[slug]) {
                            return;
                        }

                        if (stringSearchChoicesData.full_search) {
                            o_search.searchMsg = "Results from entire database, not current search constraints";
                        } else {
                            o_search.searchMsg = "Results from current search constraints";
                        }

                        if (stringSearchChoicesData.choices.length !== 0) {
                            stringSearchChoicesData.choices.unshift(o_search.searchMsg);
                            o_search.searchResultsNotEmpty = true;
                        } else {
                            o_search.searchResultsNotEmpty = false;
                        }
                        if (stringSearchChoicesData.truncated_results) {
                            stringSearchChoicesData.choices.push(o_search.truncatedResultsMsg);
                        }

                        let hintsOfString = stringSearchChoicesData.choices;
                        o_search.truncatedResults = stringSearchChoicesData.truncated_results;
                        response(displayDropDownList ? hintsOfString : null);
                    });
                },
                focus: function(focusEvent, ui) {
                    return false;
                },
                select: function(selectEvent, ui) {
                    let displayValue = o_search.extractHtmlContent(ui.item.label);
                    $(`input[name="${slug}"]`).val(displayValue);
                    $(`input[name="${slug}"]`).trigger("change");
                    // If an item in the list is selected, we update the hash with selected value
                    // opus.selections[slug] = [displayValue];
                    // o_hash.updateHash();
                    return false;
                },
            })
            .keyup(function(keyupEvent) {
                /*
                When "enter" key is pressed:
                (1) autocomplete dropdown list is closed
                (2) change event is triggered if input is an empty string
                */
                if (keyupEvent.which === 13) {
                    displayDropDownList = false;
                    $(`input[name="${slug}"]`).autocomplete("close");
                    let currentStringInputValue = $(`input[name="${slug}"]`).val().trim();
                    if (currentStringInputValue === "") {
                        $(`input[name="${slug}"]`).trigger("change");
                    }
                } else {
                    displayDropDownList = true;
                }
            })
            .focusout(function(focusoutEvent) {
                let currentStringInputValue = $(`input[name="${slug}"]`).val().trim();
                if (currentStringInputValue === "") {
                    $(`input[name="${slug}"]`).trigger("change");
                }
            })
            .data( "ui-autocomplete" );

            // element with ui-autocomplete-category class will not be selectable
            let menuWidget = $(`input[name="${slug}"].STRING`).autocomplete("widget");
            menuWidget.menu( "option", "items", "> :not(.ui-autocomplete-not-selectable)" );

            if (stringInputDropDown) {
                // Add header and footer for dropdown list
                stringInputDropDown._renderMenu = function(ul, items) {
                    ul.attr("data-slug", slug);
                    let self = this;
                    $.each(items, function(index, item) {
                       self._renderItem(ul, item );
                    });

                    if (o_search.searchResultsNotEmpty) {
                        ul.find("li:first").addClass("ui-state-disabled ui-autocomplete-not-selectable");
                    }
                    if (o_search.truncatedResults) {
                        ul.find("li:last").addClass("ui-state-disabled ui-autocomplete-not-selectable");
                    }
                };
                // Customized dropdown list item
                stringInputDropDown._renderItem = function(ul, item) {
                    return $( "<li>" )
                    .data( "ui-autocomplete-item", item )
                    .attr( "data-value", item.value )
                    // Need to wrap with <a> tag because of jquery-ui 1.10
                    .append("<a>" + item.label + "</a>")
                    .appendTo(ul);
                };
            }

            // close autocomplete dropdown menu when y-axis scrolling happens
            $("#widget-container").on("ps-scroll-y", function() {
                $("input.STRING").autocomplete("close");

                // Close dropdown list when ps scrolling is happening in widget container
                if ($(`#${widget} .op-scrollable-menu`).hasClass("show")) {
                    // Note: the selector to toggle dropdown should be the one with data-toggle="dropdown"
                    // or "dropdown-toggle" class, and in this case it's the li (.op-ranges-dropdown-menu).
                    // $(`#${widget} .op-ranges-dropdown-menu`).dropdown("toggle");
                    $(`#${widget} input.op-range-input-min`).dropdown("toggle");
                }
            });

            // Prevent overscrolling on ps in widget container when scrolling inside dropdown
            // list has reached to both ends
            $(".op-scrollable-menu").on("scroll wheel", function(e) {
                e.stopPropagation();
            });

            // If ".op-preprogrammed-ranges" is available in the widget, we move the whole
            // element into the input.op-range-input-min li and use it as the customized dropdown expandable
            // list for input.op-range-input-min. This will also make sure dropdown list always stays below
            // input.op-range-input-min.
            let rangesInfoDropdown = $(`#${widget} .op-preprogrammed-ranges`).detach();
            if (rangesInfoDropdown.length > 0) {
                $(`#${widget} input.op-range-input-min`).after(rangesInfoDropdown);
                $(`#${widget} .op-range-input`).addClass("dropdown");
                o_widgets.alignRangesDataByDecimalPoint(widget);
            }

            // add the spans that hold the hinting
            try {
                $('#' + widget + ' ul label').after(function() {
                    let value = $(this).find('input').attr("value");
                    let span_id = 'hint__' + slug + '_' + value.replace(/ /g,'-').replace(/[^\w\s]/gi, '');  // special chars not allowed in id element
                    return '<span class="hints" id="' + span_id + '"></span>';
                });
            } catch(e) { } // these only apply to mult widgets


            if ($.inArray(slug,opus.widgetsFetching) > -1) {
                opus.widgetsFetching.splice(opus.widgetsFetching.indexOf(slug), 1);
            }

            if ($.isEmptyObject(opus.selections)) {
                $('#widget__' + slug + ' .spinner').fadeOut('');
            }

            ////// EXPERIMENT AREA //////
            // console.log(`Current widget: ${slug}`);
            let widgetInputs = $(`#widget__${slug} input`);
            if (widgetInputs.hasClass("RANGE")) {
                // console.log(widgetInputs.length);
                let extraSearchInputs = $(`#widget__${slug} .op-extra-search-inputs`);
                let minRangeInputs = $(`#widget__${slug} input.op-range-input-min`);
                let maxRangeInputs = $(`#widget__${slug} input.op-range-input-max`);
                let trailingCounter = 0;
                let trailingCounterString = "";
                if (extraSearchInputs.length > 0) {
                    for (const eachMinInput of minRangeInputs) {
                        trailingCounter++;
                        trailingCounterString = (`${trailingCounter}`.length === 1 ?
                                                     `0${trailingCounter}` : `${trailingCounter}`);
                        let originalMinName = $(eachMinInput).attr("name");
                        $(eachMinInput).attr("name", `${originalMinName}_${trailingCounterString}`);
                    }

                    trailingCounter = 0;
                    for (const eachMaxInput of maxRangeInputs) {
                        trailingCounter++;
                        trailingCounterString = (`${trailingCounter}`.length === 1 ?
                                                     `0${trailingCounter}` : `${trailingCounter}`);
                        let originalMaxName = $(eachMaxInput).attr("name");
                        $(eachMaxInput).attr("name", `${originalMaxName}_${trailingCounterString}`);
                    }

                    trailingCounter = 0;
                    let preprogrammedRangesInfo = $(`#widget__${slug} .op-preprogrammed-ranges`);
                    if (preprogrammedRangesInfo.length > 1) {
                        for (const eachRangeDropdown of preprogrammedRangesInfo) {
                            // let rangesDropdownCategories = $(`#widget__${slug} .op-scrollable-menu li`);
                            let rangesDropdownCategories = $(eachRangeDropdown).find("li");
                            // console.log(eachRangeDropdown);
                            trailingCounter++;
                            trailingCounterString = (`${trailingCounter}`.length === 1 ?
                                `0${trailingCounter}` : `${trailingCounter}`);
                            for (const category of rangesDropdownCategories) {
                                let originalDataCategory = $(category).data("category");
                                let updatedDataCategory = `${originalDataCategory}_${trailingCounterString}`;

                                // console.log(originalDataCategory);
                                // console.log(updatedDataCategory);
                                // $(category).attr("data-category", updatedDataCategory);
                                $(category).data("category", updatedDataCategory);
                                $(category).find("a").attr("href", `#${updatedDataCategory}`);
                                $(category).find("a").attr("aria-controls", updatedDataCategory);
                                $(category).find(".container").attr("id", updatedDataCategory);
                            }
                        }
                    }
                }
            }
            ////// EXPERIMENT END //////

            opus.widgetsDrawn.unshift(slug);
            o_widgets.customWidgetBehaviors(slug);
            o_widgets.scrollToWidget(widget);
            o_search.getHinting(slug);
        }); // end callback for .done()
    }, // end getWidget function


    scrollToWidget: function(widget) {
        // scrolls window to a widget
        // widget is like: "widget__" + slug
        //  scroll the widget panel to top
        $('#search').animate({
            scrollTop: $("#"+ widget).offset().top
        }, 1000);
    },

    alignRangesDataByDecimalPoint: function(widget) {
        /**
         * Align the data of ranges info by decimal point.
         */
        let preprogrammedRangesInfo = $(`#${widget} .op-scrollable-menu li`);
        for (const category of preprogrammedRangesInfo) {
            let collapsibleContainerId = $(category).data("category");
            let rangesInfoInOneCategory = $(`#${collapsibleContainerId} .op-preprogrammed-ranges-data-item`);

            let maxNumOfDigitInMinDataFraction = 0;
            let maxNumOfDigitInMaxDataFraction = 0;

            for (const singleRangeData of rangesInfoInOneCategory) {

                // Special case: (maybe put this somewhere else if there are more and more long names)
                // Deal with long name, in our case, it's "Janus/Epimetheus Ring".
                // We set it the word-break to break-all.
                let rangesName = $(singleRangeData).data("name").toString();
                if (rangesName === "Janus/Epimetheus Ring") {
                    $(singleRangeData).find(".op-preprogrammed-ranges-data-name").addClass("op-word-break-all");
                }

                let minStr = $(singleRangeData).data("min").toString();
                let maxStr = $(singleRangeData).data("max").toString();
                let minIntegerPart = minStr.split(".")[0];
                let minFractionalPart = minStr.split(".")[1];
                let maxIntegerPart = maxStr.split(".")[0];
                let maxFractionalPart = maxStr.split(".")[1];

                minFractionalPart = minFractionalPart ? `.${minFractionalPart}` : "";
                maxFractionalPart = maxFractionalPart ? `.${maxFractionalPart}` : "";
                if (minFractionalPart) {
                    maxNumOfDigitInMinDataFraction = (Math.max(maxNumOfDigitInMinDataFraction,
                                                      minFractionalPart.length-1));
                }
                if (maxFractionalPart) {
                    maxNumOfDigitInMaxDataFraction = (Math.max(maxNumOfDigitInMaxDataFraction,
                                                      maxFractionalPart.length-1));
                }

                let minValReorg = `<span class="op-integer">${minIntegerPart}</span>` +
                                  `<span>${minFractionalPart}</span>`;
                let maxValReorg = `<span class="op-integer">${maxIntegerPart}</span>` +
                                  `<span>${maxFractionalPart}</span>`;

                $(singleRangeData).find(".op-preprogrammed-ranges-min-data").html(minValReorg);
                $(singleRangeData).find(".op-preprogrammed-ranges-max-data").html(maxValReorg);
            }

            // The following steps are to make sure ranges data are aligned properly with headers
            let minData = $(`#${collapsibleContainerId} .op-preprogrammed-ranges-min-data`);
            let rangesDataItem = $(`#${collapsibleContainerId} .op-preprogrammed-ranges-data-item`);
            let minDataPaddingVal = o_widgets.getPaddingValFromDigitsInFraction(maxNumOfDigitInMinDataFraction);
            let rangesDataItemPaddingVal = o_widgets.getPaddingValFromDigitsInFraction(maxNumOfDigitInMaxDataFraction);
            if (minDataPaddingVal) {
                minData.css("padding-right",`${minDataPaddingVal}em`);
            }
            if (rangesDataItemPaddingVal) {
                rangesDataItem.css("padding-right",`${rangesDataItemPaddingVal}em`);
            }
        }
    },

    getPaddingValFromDigitsInFraction: function(numOfDigits) {
        /**
         * Get padding-right values for ranges dropdown data from number of digits
         * in data fractions. Here is the mappings:
         * Num of digits in fraction    padding-right
         *          1                   1em
         *          2                   1.5em
         *          3                   2em
         * Note: currently we have at most 3 digits in data fractions.
         */
        switch(numOfDigits) {
            case 1:
                return 1;
            case 2:
                return 1.5;
            case 3:
                return 2;
            default:
                return 0;
        }
    },

    attachStringDropdownToInput: function() {
        /**
         * Make sure jquery ui autocomplete dropdown is attached right below
         * the corresponding input when browser is resized.
         */
        if ($("ul.ui-autocomplete").is(":visible")) {
            let slug = $("ul.ui-autocomplete").data("slug");
            let inputPosition = $(`input[name="${slug}"]`).offset();
            let inputHeight = $(`input[name="${slug}"]`).outerHeight();

            let autocompletePos = {left: inputPosition.left, top: inputPosition.top + inputHeight};
            $(`ul.ui-autocomplete[data-slug="${slug}"]`).offset(autocompletePos);
            $(`ul.ui-autocomplete[data-slug="${slug}"]`).width($(`input[name="${slug}"]`).width());
        }
    }
};
