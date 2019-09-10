/* jshint esversion: 6 */
/* jshint bitwise: true, curly: true, freeze: true, futurehostile: true */
/* jshint latedef: true, leanswitch: true, noarg: true, nocomma: true */
/* jshint nonbsp: true, nonew: true */
/* jshint varstmt: true */
/* jshint multistr: true */
/* globals $, PerfectScrollbar */
/* globals o_hash, o_menu, o_utils, o_widgets, opus */

/* jshint varstmt: false */
var o_search = {
/* jshint varstmt: true */

    /**
     *
     *  Everything that appears on the search tab
     *
     **/
    searchScrollbar: new PerfectScrollbar("#sidebar-container", {
        suppressScrollX: true,
        minScrollbarLength: opus.minimumPSLength
    }),
    widgetScrollbar: new PerfectScrollbar("#widget-container" , {
        suppressScrollX: true,
        minScrollbarLength: opus.minimumPSLength
    }),

    // for input validation in the search widgets
    searchTabDrawn: false,
    searchResultsNotEmpty: false,
    searchMsg: "",
    truncatedResults: false,
    truncatedResultsMsg: "&ltMore choices available&gt",
    lastSlugNormalizeRequestNo: 0,
    lastMultsRequestNo: 0,
    lastEndpointsRequestNo: 0,

    slugStringSearchChoicesReqno: {},
    slugNormalizeReqno: {},
    slugMultsReqno: {},
    slugEndpointsReqno: {},
    slugRangeInputValidValueFromLastSearch: {},

    rangesNameMatchedCounter: {},
    rangesNameTotalMatchedCounter: 0,
    // Use to determine if we should automatically expand/collapse ranges info. If it's set
    // to true, we will automatically expand/collapse ranges info depending on the matched letters.
    isTriggeredFromInput: false,
    performInputValidation: true,

    addSearchBehaviors: function() {
        // Avoid the orange blinking on border color, and also display proper border when input is in focus
        $("#search").on("focus", "input.RANGE", function(e) {
            let slug = $(this).attr("name");
            let currentValue = $(this).val().trim();

            if (o_search.slugRangeInputValidValueFromLastSearch[slug] || currentValue === "" ||
                !o_search.performInputValidation || !$(this).hasClass("search_input_invalid_no_focus")) {
                $(this).addClass("search_input_original");
            } else {
                $(this).addClass("search_input_invalid");
            }
            $(this).addClass("input_currently_focused");
            $(this).removeClass("search_input_invalid_no_focus");

            // Open the dropdown properly when user tabs to focus in.
            let slugName = $(this).data("slugname");
            let inputToTriggerDropdown = $(`#widget__${slugName} input.min`);
            let preprogrammedRangesDropdown = $(`#widget__${slugName} .op-scrollable-menu`);
            if (preprogrammedRangesDropdown.length === 0 || !$(e.target).hasClass("min")) {
                return;
            }
            if (!currentValue || o_search.rangesNameTotalMatchedCounter > 0) {
                if (!preprogrammedRangesDropdown.hasClass("show")) {
                    o_widgets.isKeepingRangesDropdownOpen = true;
                    $(this).dropdown("toggle");
                }
            }
        });

        /*
        This is to properly put back invalid search background
        when user focus out and there is no "change" event
        */
        $("#search").on("focusout", "input.RANGE", function(e) {
            $(this).removeClass("input_currently_focused");
            if ($(this).hasClass("search_input_invalid")) {
                $(this).addClass("search_input_invalid_no_focus");
                $(this).removeClass("search_input_invalid");
            }

            let currentValue = $(this).val().trim();
            if (o_search.rangesNameTotalMatchedCounter > 1 && currentValue) {
                $(this).addClass("search_input_invalid_no_focus");
            }

            o_widgets.isKeepingRangesDropdownOpen = false;
        });

        o_search.addPreprogrammedRangesSearchBehaviors();

        // Dynamically get input values right after user input a character
        $("#search").on("input", "input.RANGE", function(e) {
            if (!$(this).hasClass("input_currently_focused")) {
                $(this).addClass("input_currently_focused");
            }

            let slug = $(this).attr("name");
            let currentValue = $(this).val().trim();

            // Check if there is any match between input values and ranges names
            o_search.compareInputWithRangesInfo(currentValue, e.target);

            o_search.lastSlugNormalizeRequestNo++;
            o_search.slugNormalizeReqno[slug] = o_search.lastSlugNormalizeRequestNo;

            // values.push(currentValue)
            // opus.selections[slug] = values;
            // Call normalized api with the current focused input slug
            let newHash = `${slug}=${currentValue}`;

            /*
            Do not perform normalized api call if:
            1) Input field is empty OR
            2) Input value didn't change from the last successful search
            3) Input value didn't match any ranges names
            */
            if (currentValue === "" || currentValue === o_search.slugRangeInputValidValueFromLastSearch[slug] ||
                !o_search.performInputValidation) {
                $(e.target).removeClass("search_input_valid search_input_invalid");
                $(e.target).removeClass("search_input_invalid_no_focus");
                $(e.target).addClass("search_input_original");
                return;
            }

            let url = "/opus/__api/normalizeinput.json?" + newHash + "&reqno=" + o_search.lastSlugNormalizeRequestNo;
            $.getJSON(url, function(data) {
                // Make sure the return json data is from the latest normalized api call
                if (data.reqno < o_search.slugNormalizeReqno[slug]) {
                    return;
                }

                let returnData = data[slug];
                /*
                Parse normalized data
                If it's empty string, don't modify anything
                If it's null, add search_input_invalid class
                If it's valid, add search_input_valid class
                */
                if (returnData === "") {
                    $(e.target).removeClass("search_input_valid search_input_invalid");
                    $(e.target).addClass("search_input_original");
                } else if (returnData !== null) {
                    $(e.target).removeClass("search_input_original search_input_invalid");
                    $(e.target).removeClass("search_input_invalid_no_focus");
                    $(e.target).addClass("search_input_valid");
                } else {
                    $(e.target).removeClass("search_input_original search_input_valid");
                    $(e.target).removeClass("search_input_invalid_no_focus");
                    $(e.target).addClass("search_input_invalid");
                }
            }); // end getJSON
        });

        /*
        When user focusout or hit enter on any range input:
        Call final normalized api and validate all inputs
        Update URL (and search) if all inputs are valid
        */
        $("#search").on("change", "input.RANGE", function(e) {
            let slug = $(this).attr("name");
            let currentValue = $(this).val().trim();

            if (o_search.rangesNameTotalMatchedCounter === 1) {
                let matchedCatId = "";
                for (const eachCat in o_search.rangesNameMatchedCounter) {
                    if (o_search.rangesNameMatchedCounter[eachCat] === 1) {
                        matchedCatId = `#${eachCat}`;
                        break;
                    }
                }
                let allItemsInMatchedCat = $(`${matchedCatId} .op-preprogrammed-ranges-data-item`);
                for (const singelRangeData of allItemsInMatchedCat) {
                    if (!$(singelRangeData).hasClass("op-hide-element")) {
                        let minVal = $(singelRangeData).data("min");
                        let maxVal = $(singelRangeData).data("max");
                        let widgetId = $(singelRangeData).data("widget");

                        // NOTE: We need support both RANGE & STRING inputs, for now we implement RANGE first.
                        if ($(`#${widgetId} input.RANGE`).length !== 0) {
                            o_widgets.fillRangesInputs(widgetId, maxVal, minVal);
                            o_search.rangesNameTotalMatchedCounter = 0;
                            // close dropdown and trigger the search
                            $(`#${widgetId} input.min`).dropdown("toggle");
                            $(`#${widgetId} input.RANGE`).trigger("change");
                            return;
                        }
                        break;
                    }
                }
            } else {
                // close the dropdown
                let slugName = $(this).data("slugname");
                let inputToTriggerDropdown = $(`#widget__${slugName} input.min`);
                let preprogrammedRangesDropdown = $(`#widget__${slugName} .op-scrollable-menu`);
                if (preprogrammedRangesDropdown.hasClass("show")) {
                    inputToTriggerDropdown.dropdown("toggle");
                }
            }

            if (currentValue) {
                opus.selections[slug] = [currentValue];
            } else {
                delete opus.selections[slug];
            }
            let newHash = o_hash.updateHash(false);
            /*
            We are relying on URL order now to parse and get slugs before "&view" in the URL
            Opus will rewrite the URL when a URL is pasted, and all the search related slugs will be moved ahead of "&view"
            Refer to hash.js getSelectionsFromHash and updateHash functions
            */
            let regexForHashWithSearchParams = /(.*)&view/;
            if (newHash.match(regexForHashWithSearchParams)) {
                newHash = newHash.match(regexForHashWithSearchParams)[1];
            }
            o_search.lastSlugNormalizeRequestNo++;
            o_search.slugNormalizeReqno[slug] = o_search.lastSlugNormalizeRequestNo;
            let url = "/opus/__api/normalizeinput.json?" + newHash + "&reqno=" + o_search.lastSlugNormalizeRequestNo;

            if ($(e.target).hasClass("input_currently_focused")) {
                $(e.target).removeClass("input_currently_focused");
            }
            o_search.parseFinalNormalizedInputDataAndUpdateHash(slug, url);
        });

        $('#search').on("change", 'input.STRING', function(event) {

            let slug = $(this).attr("name");
            let css_class = $(this).attr("class").split(' ')[0]; // class will be STRING, min or max

            // get values of all inputs
            let values = [];
            if (css_class == 'STRING') {
                $("#widget__" + slug + ' input.STRING').each(function() {
                    if ($(this).val()) {
                        values.push($(this).val());
                    }
                });

                if (values.length) {
                    opus.selections[slug] = values;
                } else {
                    delete opus.selections[slug];
                }
            } else {
                // range query
                let slugNoNum = slug.match(/(.*)[1|2]/)[1];
                // min
                values = [];
                $("#widget__" + slugNoNum + '1 input.min', '#search').each(function() {
                    values[values.length] = $(this).val();
                });
                if (values.length == 0) {
                    $("#widget__" + slugNoNum + ' input.min', '#search').each(function() {
                        values[values.length] = $(this).val();
                    });
                }

                if (values.length && values[0]) {
                    opus.selections[slugNoNum + '1'] = values;
                } else {
                    delete opus.selections[slugNoNum + '1'];
                }
                // max
                values = [];
                $("#widget__" + slugNoNum + '1 input.max', '#search').each(function() {
                    values[values.length] = $(this).val();
                });
                if (values.length == 0) {
                    $("#widget__" + slugNoNum + ' input.max', '#search').each(function() {
                        values[values.length] = $(this).val();
                    });
                }

                if (values.length && values[0]) {
                    opus.selections[slugNoNum + '2'] = values;
                } else {
                    delete opus.selections[slugNoNum + '2'];
                }
            }

            if (opus.lastSelections && opus.lastSelections[slug]) {
                if (opus.lastSelections[slug][0] === $(this).val().trim()) {
                    return;
                }
            }

            // make a normalized call to avoid changing url whenever there is an invalid range input value
            let newHash = o_hash.updateHash(false);
            /*
            We are relying on URL order now to parse and get slugs before "&view" in the URL
            Opus will rewrite the URL when a URL is pasted, and all the search related slugs will be moved ahead of "&view"
            Refer to hash.js getSelectionsFromHash and updateHash functions
            */
            let regexForHashWithSearchParams = /(.*)&view/;
            if (newHash.match(regexForHashWithSearchParams)) {
                newHash = newHash.match(regexForHashWithSearchParams)[1];
            }
            o_search.lastSlugNormalizeRequestNo++;
            o_search.slugNormalizeReqno[slug] = o_search.lastSlugNormalizeRequestNo;
            let url = "/opus/__api/normalizeinput.json?" + newHash + "&reqno=" + o_search.lastSlugNormalizeRequestNo;
            o_search.parseFinalNormalizedInputDataAndUpdateHash(slug, url);
        });

        $("#search").on("change", "input.multichoice, input.singlechoice", function() {
            // mult widget gets changed
            let id = $(this).attr("id").split("_")[0];
            let value = $(this).attr("value");

            if ($(this).is(":checked")) {
                let values = [];
                if (opus.selections[id]) {
                    values = opus.selections[id]; // this param already has been constrained
                }

                // for surfacegeometry we only want a target selected
                if (id === "surfacegeometrytargetname") {
                    opus.selections[id] = [value];
                } else {
                    // add the new value to the array of values
                    values.push(value);
                    // add the array of values to selections
                    opus.selections[id] = values;
                }

                // special menu behavior for surface geo, slide in a loading indicator..
                if (id == "surfacetarget") {
                    let surface_loading = '<li style="margin-left:50%; display:none" class="spinner">&nbsp;</li>';
                    $(surface_loading).appendTo($("a.surfacetarget").parent()).slideDown("slow").delay(500);
                }

            } else {
                let remove = opus.selections[id].indexOf(value); // find index of value to remove
                opus.selections[id].splice(remove,1);        // remove value from array

                if (opus.selections[id].length === 0) {
                    delete opus.selections[id];
                }
            }
            o_hash.updateHash();
        });

        // range behaviors and string behaviors for search widgets - qtype select dropdown
        $('#search').on("change", "select", function() {
            let qtypes = [];

            switch ($(this).attr("class")) {  // form type
                case "RANGE":
                    let slugNoNum = $(this).attr("name").match(/-(.*)/)[1];
                    $(`#widget__${slugNoNum} select`).each(function() {
                        qtypes.push($(this).val());
                    });
                    opus.extras[`qtype-${slugNoNum}`] = qtypes;
                    break;

                case "STRING":
                    let slug = $(this).attr("name").match(/-(.*)/)[1];
                    $(`#widget__${slug} select`).each(function() {
                        qtypes.push($(this).val());
                    });
                    opus.extras[`qtype-${slug}`] = qtypes;
                    break;
            }

            o_hash.updateHash();
        });
    },

    addPreprogrammedRangesSearchBehaviors: function() {
        /**
         * Add customized event handlers for preprogrammed ranges dropdown and expandable
         * list when user types/focus in & out of the input. This function will be called
         * in addSearchBehaviors.
         */

        // Make sure ranges info shows up automatically when the count of matched characters
        // is not 0. We do this in the event handler when the collpasing is done. This is to avoid
        // the race condition of the collapsing animation when user types fast in the input.
        $(`#search`).on("hidden.bs.collapse", ".op-scrollable-menu .container", function(e) {
            if (o_search.isTriggeredFromInput) {
                let collapsibleContainerId = $(e.target).attr("id");
                if (o_search.rangesNameMatchedCounter[collapsibleContainerId]) {
                    $(e.target).collapse("show");
                }
            }
        });

        // Make sure ranges info hides automatically when the count of matched characters
        // is 0. We do this in the event handler when the expanding is done. This is to avoid
        // the race condition of the expanding animation when user types fast in the input.
        $(`#search`).on("shown.bs.collapse", ".op-scrollable-menu .container", function(e) {
            if (o_search.isTriggeredFromInput) {
                let collapsibleContainerId = $(e.target).attr("id");
                if (o_search.rangesNameMatchedCounter[collapsibleContainerId] === 0) {
                    $(e.target).collapse("hide");
                }
            }
        });

        // When there is no matched characters of ranges names and the category is collapsed,
        // the empty category will not be expanded when user clicks it.
        $(`#search`).on("show.bs.collapse", ".op-scrollable-menu .container", function(e) {
            let collapsibleContainerId = $(e.target).attr("id");
            let widgetId = $(e.target).data("widget");
            let currentIuputValue = $(`#${widgetId} input.min`).val().trim();
            if (o_search.rangesNameMatchedCounter[collapsibleContainerId] === 0 && currentIuputValue) {
                e.preventDefault();
            }
        });

        // Set isTriggeredFromInput to false, this will make sure we can still expand/collapse
        // ranges info by mouse clicking.
        $(`#search`).on("click", ".op-scrollable-menu", function(e) {
            o_search.isTriggeredFromInput = false;
        });

        // Reset scrollbar to top if there is no matched ranges info when dropdown is open.
        $("#search").on("shown.bs.dropdown", function(e) {
            $(".op-scrollable-menu").scrollTop(0);
        });

        // Make sure dropdown is not shown if user focus into an input with numerical value.
        $("#search").on("show.bs.dropdown", function(e) {
            let minInput = $(e.target).find("input.op-ranges-dropdown-menu");
            if (minInput.length === 0) {
                return;
            }
            let currentValue = minInput.val().trim();
            if (o_search.rangesNameTotalMatchedCounter === 0 && currentValue) {
                e.preventDefault();
            }
        });
    },

    compareInputWithRangesInfo: function(currentValue, targetInput) {
        /**
         * When user is typing, iterate through all preprogrammed ranges info.
         * 1. If input field is empty, display the whole list with all categories collapsed.
         * 2. If input matches any of list items, expand those categories. Highlight and display
         * matched items, and hide all unmatched items. Collpase and hide the empty categories.
         */
        o_search.isTriggeredFromInput = true;
        let slugName = $(targetInput).data("slugname");
        let inputToTriggerDropdown = $(`#widget__${slugName} input.min`);
        let preprogrammedRangesDropdown = $(`#widget__${slugName} .op-scrollable-menu`);
        let preprogrammedRangesInfo = $(`#widget__${slugName} .op-scrollable-menu li`);

        // If ranges info is not available, return from the function.
        if (preprogrammedRangesDropdown.length === 0 || !$(targetInput).hasClass("min")) {
            o_search.performInputValidation = true;
            return;
        }

        for (const category of preprogrammedRangesInfo) {
            let collapsibleContainerId = $(category).data("category");
            let rangesInfoInEachCategory = $(`#${collapsibleContainerId} .op-preprogrammed-ranges-data-item`);
            o_search.rangesNameMatchedCounter[collapsibleContainerId] = 0;

            for (const singleRangeData of rangesInfoInEachCategory) {
                let dataName = $(singleRangeData).data("name").toLowerCase();
                let currentInputValue = currentValue.toLowerCase();

                if (!currentValue) {
                    $(`.op-scrollable-menu a.dropdown-item`).removeClass("op-hide-element");
                    $(singleRangeData).removeClass("op-hide-element");
                    o_search.removeHighlightedRangesName(singleRangeData);
                    for (const eachCat in o_search.rangesNameMatchedCounter) {
                        o_search.rangesNameMatchedCounter[eachCat] = 0;
                    }
                } else if (dataName.includes(currentInputValue)) {
                    // Expand the category, display the item and highlight the matched keyword.
                    $(`a.dropdown-item[href*="${collapsibleContainerId}"]`).removeClass("op-hide-element");
                    $(singleRangeData).removeClass("op-hide-element");
                    o_search.highlightMatchedRangesName(singleRangeData, currentInputValue);
                    o_search.rangesNameMatchedCounter[collapsibleContainerId] += 1;
                    if (!$(`#${collapsibleContainerId}`).hasClass("show")) {
                        $(`#${collapsibleContainerId}`).collapse("show");
                    }
                } else {
                    // Hide the item if it doesn't match the input keyword
                    $(singleRangeData).addClass("op-hide-element");
                }
            }

            if (o_search.rangesNameMatchedCounter[collapsibleContainerId] === 0) {
                $(`#${collapsibleContainerId}`).collapse("hide");
                if (currentValue) {
                    $(`a.dropdown-item[href*="${collapsibleContainerId}"]`).addClass("op-hide-element");
                }
            }
            o_search.setRangesDropdownScrollbarPos(preprogrammedRangesDropdown);
            // Note: the selector to toggle collapse should be the one with "collapse" class.
            // $(`#${containerId}`).collapse("show");
        }

        // If there is one or more matched ranges names, don't perform input validation.
        o_search.performInputValidation = true;
        o_search.rangesNameTotalMatchedCounter = 0;
        for (const eachCat in o_search.rangesNameMatchedCounter) {
            if (o_search.rangesNameMatchedCounter[eachCat] !== 0) {
                o_search.performInputValidation = false;
                o_search.rangesNameTotalMatchedCounter += o_search.rangesNameMatchedCounter[eachCat];
            }
        }

        if (o_search.rangesNameTotalMatchedCounter === 0 && currentValue) {
            if (preprogrammedRangesDropdown.hasClass("show")) {
                inputToTriggerDropdown.dropdown("toggle");
            }
        } else {
            if (!preprogrammedRangesDropdown.hasClass("show")) {
                inputToTriggerDropdown.dropdown("toggle");
            }
        }
    },

    highlightMatchedRangesName: function(singleRangeData, currentInputValue) {
        /**
         * Highlight characters of ranges names that match user's input.
         */
        let originalText = $(singleRangeData).data("name");
        let matchedIdx = originalText.toLowerCase().indexOf(currentInputValue);
        let matchedLength = currentInputValue.length;

        // We use "+" to concatenate strings instead of `` string interpolation because
        // we are going to put the highlightedText in html, and white spaces (or new line)
        // will break the format and give the highlighted letters extra spaces at both ends.
        let highlightedText = (originalText.slice(0, matchedIdx) + "<b>" +
                               originalText.slice(matchedIdx, matchedIdx + matchedLength) +
                               "</b>" + originalText.slice(matchedIdx + matchedLength));

        $(singleRangeData).find(".op-preprogrammed-ranges-data-name").html(highlightedText);
    },

    removeHighlightedRangesName: function(singleRangeData) {
        /**
         * Remove highlighted characters of ranges names that match user's input.
         */
        let originalText = $(singleRangeData).data("name");
        $(singleRangeData).find(".op-preprogrammed-ranges-data-name").html(originalText);
    },

    setRangesDropdownScrollbarPos: function(rangesDropdownElement) {
        /**
         * Set ranges info dropdown scrollbar position to make sure scrollbar scrolls
         * to the first matched category when there is a matched character.
         */
        for (let category in o_search.rangesNameMatchedCounter) {
            if (o_search.rangesNameMatchedCounter[category]) {
                let targetTopPosition = $(`li[data-category="${category}"]`).offset().top;
                let containerTopPosition = rangesDropdownElement.offset().top;
                let containerScrollbarPosition = rangesDropdownElement.scrollTop();
                let finalScrollbarPosition = targetTopPosition - containerTopPosition + containerScrollbarPosition;
                rangesDropdownElement.scrollTop(finalScrollbarPosition);
                return;
            }
        }
        // Set to top if there is no match.
        $(".op-scrollable-menu").scrollTop(0);
    },

    allNormalizedApiCall: function() {
        let newHash = o_hash.updateHash(false);
        /*
        We are relying on URL order now to parse and get slugs before "&view" in the URL
        Opus will rewrite the URL when a URL is pasted, and all the search related slugs will be moved ahead of "&view"
        Refer to hash.js getSelectionsFromHash and updateHash functions
        */
        let regexForHashWithSearchParams = /(.*)&view/;
        if (newHash.match(regexForHashWithSearchParams)) {
            newHash = newHash.match(regexForHashWithSearchParams)[1];
        }
        opus.waitingForAllNormalizedAPI = true;
        opus.lastAllNormalizeRequestNo++;
        let url = "/opus/__api/normalizeinput.json?" + newHash + "&reqno=" + opus.lastAllNormalizeRequestNo;
        return $.getJSON(url);
    },

    validateRangeInput: function(normalizedInputData, removeSpinner=false) {
        opus.allInputsValid = true;
        o_search.slugRangeInputValidValueFromLastSearch = {};

        $.each(normalizedInputData, function(eachSlug, value) {
            let currentInput = $(`input[name="${eachSlug}"]`);
            if (value === null) {
                if (currentInput.hasClass("RANGE")) {
                    if (currentInput.hasClass("input_currently_focused")) {
                        $("#sidebar").addClass("search_overlay");
                    } else {
                        $("#sidebar").addClass("search_overlay");
                        currentInput.addClass("search_input_invalid_no_focus");
                        currentInput.removeClass("search_input_invalid");
                        currentInput.val(opus.selections[eachSlug]);
                    }
                }
                opus.allInputsValid = false;
            } else {
                if (currentInput.hasClass("RANGE")) {
                    /*
                    If current focused input value is different from returned normalized data
                    we will not overwrite its displayed value.
                    */
                    if (currentInput.hasClass("input_currently_focused") && currentInput.val() !== value) {
                        o_search.slugRangeInputValidValueFromLastSearch[eachSlug] = value;
                    } else {
                        currentInput.val(value);
                        o_search.slugRangeInputValidValueFromLastSearch[eachSlug] = value;
                        opus.selections[eachSlug] = [value];
                        // No color border if the input value is valid
                        currentInput.addClass("search_input_original");
                        currentInput.removeClass("search_input_invalid_no_focus");
                        currentInput.removeClass("search_input_invalid");
                        currentInput.removeClass("search_input_valid");
                    }
                }
            }
        });

        if (opus.allInputsValid) {
            o_hash.updateHash();
        } else {
            $("#op-result-count").text("?");
            // set hinting info to ? when any range input has invalid value
            // for range
            $(".op-range-hints").each(function() {
                if ($(this).children().length > 0) {
                    $(this).html(`<span>Min:&nbsp;<span class="op-hints-info">?</span></span>
                                  <span>Max:&nbsp;<span class="op-hints-info">?</span></span>
                                  <span>Nulls:&nbsp;<span class="op-hints-info">?</span></span>`);
                }
            });
            // for mults
            $(".hints").each(function() {
                $(this).html("<span>?</span>");
            });

            if (removeSpinner) {
                $(".spinner").fadeOut("");
            }
        }
    },

    parseFinalNormalizedInputDataAndUpdateHash: function(slug, url) {
        $.getJSON(url, function(normalizedInputData) {
            // Make sure it's the final call before parsing normalizedInputData
            if (normalizedInputData.reqno < o_search.slugNormalizeReqno[slug]) {
                return;
            }

            // check each range input, if it's not valid, change its background to red
            // and also remove spinner.
            o_search.validateRangeInput(normalizedInputData, true);
            if (!opus.allInputsValid) {
                return;
            }

            o_hash.updateHash();
            if (o_utils.areObjectsEqual(opus.selections, opus.lastSelections))  {
                // Put back normal hinting info
                opus.widgetsDrawn.forEach(function(eachSlug) {
                    o_search.getHinting(eachSlug);
                });
                $("#op-result-count").text(o_utils.addCommas(o_browse.totalObsCount));
            }
            $("input.RANGE").each(function() {
                if (!$(this).hasClass("input_currently_focused")) {
                    $(this).removeClass("search_input_valid");
                    $(this).removeClass("search_input_invalid");
                    $(this).addClass("search_input_original");
                }
            });
            // $("input.RANGE").removeClass("search_input_valid");
            // $("input.RANGE").removeClass("search_input_invalid");
            // $("input.RANGE").addClass("search_input_original");
            $("#sidebar").removeClass("search_overlay");
        });
    },

    extractHtmlContent: function(htmlString) {
        let domParser = new DOMParser();
        let content = domParser.parseFromString(htmlString, "text/html").documentElement.textContent;
        return content;
    },

    searchBarContainerHeight: function() {
        let mainNavHeight = $("#op-main-nav").outerHeight();
        let footerHeight = $(".app-footer").outerHeight();
        let resetButtonHeight = $(".op-reset-button").outerHeight();
        let dividerHeight = $(".shadow-divider").outerHeight();
        let offset = mainNavHeight + footerHeight + resetButtonHeight + dividerHeight;
        return $("#search").height() - offset;
    },

    searchHeightChanged: function() {
        o_search.searchSideBarHeightChanged();
        o_search.searchWidgetHeightChanged();
    },

    searchSideBarHeightChanged: function() {
        let containerHeight = o_search.searchBarContainerHeight();
        let searchMenuHeight = $(".op-search-menu").height();
        $("#search .sidebar_wrapper").height(containerHeight);

        if (containerHeight > searchMenuHeight) {
            $("#sidebar-container .ps__rail-y").addClass("hide_ps__rail-y");
            o_search.searchScrollbar.settings.suppressScrollY = true;
        } else {
            $("#sidebar-container .ps__rail-y").removeClass("hide_ps__rail-y");
            o_search.searchScrollbar.settings.suppressScrollY = false;
        }

        o_search.searchScrollbar.update();
    },

    searchWidgetHeightChanged: function() {
        let footerHeight = $(".app-footer").outerHeight();
        let mainNavHeight = $("#op-main-nav").outerHeight();
        let totalNonSearchAreaHeight = footerHeight + mainNavHeight;
        let containerHeight = $("#search").height() - totalNonSearchAreaHeight;
        let searchWidgetHeight = $("#op-search-widgets").height();
        $(".op-widget-column").height(containerHeight);

        if (containerHeight > searchWidgetHeight) {
            $("#widget-container .ps__rail-y").addClass("hide_ps__rail-y");
            o_search.widgetScrollbar.settings.suppressScrollY = true;
        } else {
            $("#widget-container .ps__rail-y").removeClass("hide_ps__rail-y");
            o_search.widgetScrollbar.settings.suppressScrollY = false;
        }

        o_search.widgetScrollbar.update();
    },

    activateSearchTab: function() {

        if (o_search.searchTabDrawn) {
            return;
        }

        // get any prefs from cookies
        if (!opus.prefs.widgets.length && $.cookie("widgets")) {
            opus.prefs.widgets = $.cookie("widgets").split(',');
        }
        // get menu
        o_menu.getNewSearchMenu();

        // find and place the widgets
        if (!opus.prefs.widgets.length) {
            // no widgets defined, get the default widgets
            opus.prefs.widgets = ["planet","target"];
            o_widgets.placeWidgetContainers();
            o_widgets.getWidget("planet","#op-search-widgets");
            o_widgets.getWidget("target","#op-search-widgets");
        } else {
            if (!opus.widgetElementsDrawn.length) {
                o_widgets.placeWidgetContainers();
            }
        }

        o_widgets.updateWidgetCookies();

        $.each(opus.prefs.widgets, function(key, slug) {
            if ($.inArray(slug, opus.widgetsDrawn) < 0) {  // only draw if not already drawn
                o_widgets.getWidget(slug,"#op-search-widgets");
            }
        });

        o_search.searchTabDrawn = true;
    },

    getHinting: function(slug) {

        if ($(".widget__" + slug).hasClass("range-widget")) {
            // this is a range field
            o_search.getRangeEndpoints(slug);

        } else if ($(".widget__" + slug).hasClass("mult-widget")) {
            // this is a mult field
            o_search.getValidMults(slug);
        } else {
          $(`#widget__${slug} .spinner`).fadeOut();
        }
    },

    getRangeEndpoints: function(slug) {

        $(`#widget__${slug} .spinner`).fadeIn();

        o_search.lastEndpointsRequestNo++;
        o_search.slugEndpointsReqno[slug] = o_search.lastEndpointsRequestNo;
        let url = `/opus/__api/meta/range/endpoints/${slug}.json?${o_hash.getHash()}&reqno=${o_search.slugEndpointsReqno[slug]}`;
        $.ajax({url: url,
            dataType:"json",
            success: function(multdata) {
                $(`#widget__${slug} .spinner`).fadeOut();

                if (multdata.reqno< o_search.slugEndpointsReqno[slug]) {
                    return;
                }
                $('#hint__' + slug).html(`<span>Min:&nbsp;<span class="op-hints-info">${multdata.min}</span></span>
                                          <span>Max:&nbsp;<span class="op-hints-info">${multdata.max}</span></span>
                                          <span>Nulls:&nbsp;<span class="op-hints-info">${multdata.nulls}</span></span>`);
            },
            statusCode: {
                404: function() {
                    $(`#widget__${slug} .spinner`).fadeOut();
                }
            },
            error:function(xhr, ajaxOptions, thrownError) {
                $(`#widget__${slug} .spinner`).fadeOut();
                // range input hints are "?" when wrong values of url is pasted
                $(`#hint__${slug}`).html(`<span>Min:&nbsp;<span class="op-hints-info">?</span></span>
                                          <span>Max:&nbsp;<span class="op-hints-info">?</span></span>
                                          <span>Nulls:&nbsp;<span class="op-hints-info">?</span></span>`);
            }
        }); // end mults ajax
    },

    getValidMults: function(slug) {
        // turn on spinner
        $(`#widget__${slug} .spinner`).fadeIn();

        o_search.lastMultsRequestNo++;
        o_search.slugMultsReqno[slug] = o_search.lastMultsRequestNo;
        let url = `/opus/__api/meta/mults/${slug}.json?${o_hash.getHash()}&reqno=${o_search.slugMultsReqno[slug]}`;
        $.ajax({url: url,
            dataType:"json",
            success: function(multdata) {
                if (multdata.reqno < o_search.slugMultsReqno[slug]) {
                    return;
                }

                let dataSlug = multdata.field;
                $("#widget__" + dataSlug + " .spinner").fadeOut('');

                let widget = "widget__" + dataSlug;
                let mults = multdata.mults;
                $('#' + widget + ' input').each( function() {
                    let value = $(this).attr("value");
                    let id = '#hint__' + slug + "_" + value.replace(/ /g,'-').replace(/[^\w\s]/gi, '');  // id of hinting span, defined in widgets.js getWidget

                    if (mults[value]) {
                          $(id).html('<span>' + mults[value] + '</span>');
                          if ($(id).parent().hasClass("fadey")) {
                            $(id).parent().removeClass("fadey");
                          }
                    } else {
                        $(id).html('<span>0</span>');
                        $(id).parent().addClass("fadey");
                    }
                });
            },
            statusCode: {
                404: function() {
                  $(`#widget__${slug} .spinner`).fadeOut();
              }
            },
            error:function(xhr, ajaxOptions, thrownError) {
                $(`#widget__${slug} .spinner`).fadeOut();
                // checkbox hints are "?" when wrong values of url is pasted
                $(".hints").each(function() {
                    $(this).html("<span>?</span>");
                });
            }
        }); // end mults ajax

    },
};
