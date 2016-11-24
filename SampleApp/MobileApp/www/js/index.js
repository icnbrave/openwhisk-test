/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

    function isValidURL(url) {
        var RegExp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
        if (RegExp.test(url)) {
            return true;
        } else {
            return false;
        }
    }

    function readSingleFile(filename) {
        var contents = "";
        if (filename) {
            var r = new FileReader();
            r.onload = function(e) {
                contents = e.target.result;
                var lines = contents.split("\n").filter(function(el) {
                    return el.length != 0
                });

                for (var n = 0; n < lines.length; n++) {
                    if (!isBlank(lines[n])) {
                        console.log(lines[n]);
                        var dataLine = lines[n].split(",").filter(function(el) {
                            return el.length != 0
                        });
                        var req_data = [];
                        var post_data = {
                            "url" : dataLine[0]
                        };

                        if (!isBlank(dataLine[1])) {
                            post_data.encoding = dataLine[1];
                        }
                        req_data.push(post_data);

                        var row_id = 'row_' + (new Date()).getTime();
                        var encoding = (post_data.encoding == null) ? ''
                                : post_data.encoding;

                        $('#result_multiple tr:last')
                                .after(
                                        '<tr id="' + row_id + '"><td>'
                                                + post_data.url
                                                + '</td>'
                                                + '<td><span style="color:blue">Please wait ....</span></td>'
                                                + '<td>' + encoding + '</td>'
                                                + '<td></td>' + '</tr>');

                        $
                                .ajax({
                                    type : 'POST',
                                    url : 'http://garbagecodedetection.mybluemix.net/rest/garbagechar_scan',
                                    data : JSON.stringify(req_data),
                                    dataType : "json",
                                    rowId : row_id,
                                    success : function(respList) {
                                        var resp = respList[0];
                                        var status = '<span style="color:blue">passed</span>';
                                        if (resp.garbagechar_found) {
                                            status = '<span style="color:red">failed</span>';
                                        }
                                        $(
                                                'table#result_multiple tr#'
                                                        + this.rowId).remove();

                                        var row = '<tr><td>' + resp.url
                                                + '</td>' + '<td>' + status
                                                + '</td>' + '<td>'
                                                + resp.doc_charset + '</td>'
                                                + '<td>' + resp.garbled_lines
                                                + '</td>' + '</tr>';

                                        $('table#result_multiple')
                                                .find('tbody').append(row)
                                                .trigger('addRows', [ row ]);
                                        
                                        $("#table#result_multiple").trigger("sorton", [[1,"a"]]);

                                        //$('#result_multiple tr:last').after('<tr><td>' + resp.url + '</td>' +
                                        //'<td>' + status + '</td>' +
                                        //'<td>' + resp.doc_charset + '</td>' +
                                        //'<td>' + resp.garbled_lines + '</td>' +
                                        //'</tr>');
                                        //$('table#result_multiple').trigger('updateAll');
                                    }
                                });

                    }
                }
            }
            r.readAsText(filename);
        } else {
            alert("Failed to load file");
        }
        
        return contents;
    }

    function isBlank(str) {
        return (!str || /^\s*$/.test(str));
    }

    $(document).ready(init);

    function init() {
        $("#multiple").hide();
        $("#single").show();

        $("#singleR").prop("checked", true);

        $('input[type="radio"]').on('change', function() {
            var myRadio = $('input[name="urlRadio"]:checked').val();
            if (myRadio == "single") {
                $("#multiple").hide();
                $("#single").show();
            }
            if (myRadio == "multiple") {
                $("#single").hide();
                $("#multiple").show();
                $('#result_multiple').hide();
            }
        });

        $('#result').text('Not started');
        $("#result").css("color", "blue");
        $('#encoding').text('');
        $("#encoding").css("color", "blue");
        $("#corruption").hide();

        $(function() {
            $('#fileinput').change(function() {
                // clean up table
                $("#result_multiple").find("tr:not(:first)").remove();
                $('#result_multiple').show();
                var filename = $('#fileinput').prop('files');
                readSingleFile(filename[0]);
            });

            $("#target")
                    .submit(
                            function(e) {
                                e.preventDefault();

                                $("#result").text("Please wait .....");
                                $("#result").css("color", "blue");
                                $('#encoding').text('');
                                $("#corruption").hide();

                                var req_data = [];
                                var url = $("#url").val();
                                url = url.replace(/([^:]\/)\/+/g, "$1");

                                var post_data = {
                                    "url" : url
                                };

                                if (!isValidURL($.trim(url))) {
                                    $("#result")
                                            .text(
                                                    "Please enter a valid URL. Protocol is required (http://, https://)");
                                    $("#result").css("color", "red");
                                    return;
                                }
                                var charset = $("#page_charset").val();
                                if ($.trim($("#page_charset").val()) != '') {
                                    post_data.encoding = charset;
                                }
                                req_data.push(post_data);

                                $
                                        .ajax({
                                            type : 'POST',
                                            url : 'http://garbagecodedetection.mybluemix.net/rest/garbagechar_scan',
                                            data : JSON.stringify(req_data),
                                            dataType : "json",
                                            success : function(respList) {

                                                var resp = respList[0];
                                                if (typeof resp.errMsg != "undefined"
                                                        && $.trim(resp.errMsg) != '') {
                                                    $("#result").text(
                                                            resp.errMsg);
                                                    $("#result").css("color",
                                                            "red");

                                                    return;
                                                }

                                                if (resp.garbagechar_found) {
                                                    $("#result")
                                                            .text(
                                                                    "Invalid characters found");
                                                    $("#result").css("color",
                                                            "red");
                                                } else {
                                                    $("#result")
                                                            .text(
                                                                    "No invalid characters found");
                                                    $("#result").css("color",
                                                            "blue");
                                                }

                                                $("#encoding").text(
                                                        resp.doc_charset);
                                                $("#encoding").css("color",
                                                        "blue");

                                                var garbled_lines = resp.garbled_lines;
                                                var garbledmsg_html = '';
                                                for (var i = 0; i < garbled_lines.length; i++) {
                                                    garbledmsg_html = garbledmsg_html
                                                            + garbled_lines[i]
                                                            + "<br/> <br/>";
                                                }

                                                if ($.trim(garbledmsg_html) != '') {
                                                    $("#corruption").show();
                                                    $("#corruptmsg").html(
                                                            garbledmsg_html);
                                                    $("#corruptmsg").css(
                                                            "color", "red");
                                                }
                                            }
                                        });
                            });
        });

        $('input[name=gsa_path]').keyup(function() {
            $(this).val($(this).val().replace(/ +?/g, ''));
        });

        $('input[name=file_ext]').keyup(function() {
            $(this).val($(this).val().replace(/ +?/g, ''));
        });
    }

        $(function() {
        // Helper function to convert a string of the form "Mar 15, 1987" into a Date object.
        var date_from_string = function(str) {
            var months = [ "jan", "feb", "mar", "apr", "may", "jun", "jul",
                    "aug", "sep", "oct", "nov", "dec" ];
            var pattern = "^([a-zA-Z]{3})\\s*(\\d{1,2}),\\s*(\\d{4})$";
            var re = new RegExp(pattern);
            var DateParts = re.exec(str).slice(1);
            var Year = DateParts[2];
            var Month = $.inArray(DateParts[0].toLowerCase(), months);
            var Day = DateParts[1];
            return new Date(Year, Month, Day);
        }
        var table = $("table#result_multiple").stupidtable({
            "date" : function(a, b) {
                // Get these into date objects for comparison.
                aDate = date_from_string(a);
                bDate = date_from_string(b);
                return aDate - bDate;
            }
        });
        table.on("beforetablesort", function(event, data) {
            // Apply a "disabled" look to the table while sorting.
            // Using addClass for "testing" as it takes slightly longer to render.
            $("table#result_multiple").addClass("disabled");
        });
        table.on("aftertablesort", function(event, data) {
            // Reset loading message.
            $("table#result_multiple").removeClass("disabled");
            var th = $(this).find("th");
            var dir = $.fn.stupidtable.dir;
            if (data.direction === dir.ASC) {
                $("th").css('background-image', 'url(images/asc.gif)');
            } else {
                $("th").css('background-image', 'url(images/desc.gif)');
            }
        });

        $("table#result_multiple").find("th").eq(2).click(); // default cloumn to be sorted
    });