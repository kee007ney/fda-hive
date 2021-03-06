/*
 *  ::718604!
 * 
 * Copyright(C) November 20, 2014 U.S. Food and Drug Administration
 * Authors: Dr. Vahan Simonyan (1), Dr. Raja Mazumder (2), et al
 * Affiliation: Food and Drug Administration (1), George Washington University (2)
 * 
 * All rights Reserved.
 * 
 * The MIT License (MIT)
 * 
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

if (!javaScriptEngine)
    var javaScriptEngine = vjJS["undefined"];
javaScriptEngine.include("js/vjAlignmentView.js");

vjHO.register('svc-alignment2').Constructor = function() 
{
    if (this.objCls)
        return; // stupid chrome loads from both cached file and the one coming
                // from server.

    this.typeName = "svc-alignment2";
    this.objCls = "obj-svc-alignment" + Math.random();
    vjObj.register(this.objCls, this);
    this.dsQPBG = vjDS.add("preparing download", "dsQpbgAlignment", "static://");
    var curStat;
    var that = this;
    
    this.onArchiveSubmit = function(viewer, content) {
        var icon;
        var txt = "";
        if (!isok(content)) {
            txt = "Program error: could not submit dataset to archiver";
            icon = "img/redInfo.png";
        } else if (content.indexOf("error") >= 0) {
            txt = content;
            icon = "img/redInfo.png";
        } else {
            txt = "Your data succesfully submitted for digestion (reqId:"
                    + content + ")!\n";
            txt += "You may monitor the process in you inbox under the 'data loading' tab";
            icon = "img/done.gif";
        }
        alertI(txt, undefined, {
            icon : icon
        });
    };
    this.dsQPBG_digest = vjDS.add('preparing to archive', 'ds' + this.objCls
            + '_QPBG_digest', 'static://', {
        func : this.onArchiveSubmit,
        obj : this
    });
    
    var openTabsOnRefresh = true;

    this.fullview = function(node, dv) 
    {
        vjDS.add("Retrieving list of hits", "hitlist", "http://?cmd=alCount&start=0&cnt=50&objs=" + node.id + (node.subsetCount ? "&childProcessedList=" + node.subsetCount : ""));
        vjDS.add("Building saturation graph", "alSaturation", "qpbg_http://?cmd=alSaturation&wrap=50000&start=0&objs=" + node.id);
        vjDS.add("Building histogram", "histograms", "qpbg_tblqryx4://histogram.csv//hdr=1&objs=" + node.id + "&tqs=" + vjDS.escapeQueryLanguage(JSON.stringify([{
                    op : "filter",
                    arg : {
                        cols : [ 1, 2, 3 ],
                        method : "range",
                        value : {
                            min : 0
                        }
                    }
                } ])) + "&resolution=" + this.graphResolution);
        vjDS.add("Loading histogram help", "help_histograms", "http://help/hlp.view.alignment.histogram.html");
        vjDS.add("Preparing alignments", "alView", "http://?cmd=alView&start=0&cnt=50&info=1&mySubID=1&printNs=1&objs=" + node.id,0,"Element #,#,Direction,Start,Alignment,End,Sequence,Repeats,Position,PosHigh,Motif Start,Motif End");
        vjDS.add("Searching for position information", "alIonAnnot", "static://");
        vjDS.add("Visualizing alignments in stack", "alStack", "http://?cmd=alStack&start=0&cnt=50&info=1&mySubID=1&alHigh=50&printNs=1&objs=" + node.id);
        vjDS.add("Fetching alignments", "alMatch", "http://?cmd=alMatch&start=0&cnt=50&info=1&mySubID=1&objs=" + node.id);
        vjDS.add("Creating mutation bias diagram", "alMutBias", "http://?cmd=alMutBias&start=0&cnt=50&mySubID=1&info=1&objs=" + node.id, 0, "Position,Count-A,Count-C,Count-G,Count-T");
        vjDS.add("infrastructure: Creating download menu", "downloads", "static://");
        vjDS.add("infrastructure: Creating download menu", "downloadAll", "static://General Data,down,arch,operation,arguments,params\n"
                + "Hit list,download,ico-file,hitlist,&qty=-1,\n"
                + "Unaligned Reads,download,dnaold,alFasta,&backend=1,all\n"
                + "Unaligned Reads (FASTQ),download,dnaold,alFastq,&backend=1,all\n"
                + "Aligned Reads,download,dnaold,alFasta,&qty=-1,\n"
                + "Alignments,download,ico-file,alView,&qty=-1,\n"
                + "Alignments in SAM format with original identifiers,download,ico-file,alSam,&qty=-1&useOriginalID=1,\n"
                + "Alignments in SAM format using numeric identifiers,download,ico-file,alSam,&qty=-1&useOriginalID=0,\n"
                + "Alignments in BED format,download,ico-file,alBed,&qty=-1,\n"
                + "Hit Table,download,ico-file,alMatch,&qty=-1,");
        vjDS.add("infrastructure: Creating help", "help", "http://help/hlp.view.results.alignment.html");
        
        this.customizeView(node, dv);
        
        vjDS["hitlist"].register_callback(function(param, data){
            hitListViewer[1].composerFunction(param, data);
            hitListViewer[1].onClickCell(hitListViewer[1], 1, 0);
            
            var instance;
            if (hitListViewer[1].dim() > 2){
                instance =  [ that.donwloadGeneral, that.downloadsViewer ];
            }else{
                instance = that.donwloadGeneral;
            }
            var tabStruct = [{
                tabId: 'downloadAll',
                tabName: "Downloads",
                position: {posId: 'minimal', top:'0', bottom:'30%', left:'20%', right:'70%'},
                //multiView: true,
                inactive: true,
                viewerConstructor: {
                    instance: instance
                   }, 
                  autoOpen: that.autoOpen
            }];
            algoWidgetObj.addTabs(tabStruct, that.addTo);
            
            if (curStat >= 5){
                algoWidgetObj.moveTab("hitList", {top:'0', bottom:'30%', left:'20%', right:'60%'}, 0);
                algoWidgetObj.moveTab("alignments", {top:'0', bottom:'30%', left:'60%', right:'100%'}, 0);
            }
        });
    };
    
    //var hitListViewer;//this is bad, need to figure out a way to get the viewer from a layout. Ask Alexey
    this.customizeView = function (node, dv)
    {
        this.loadedID = node.id;
        this.downloadsViewer = new vjAlignmentDownloadsView ({
            data : 'downloads',
            formName : formName,
            width: "100%",
            maxTxtLen : 50,
            selectCallback : "function:vjObjFunc('onPerformReferenceOperation','"+ this.objCls + "')",
            isok : true
        });
        
        this.donwloadGeneral = new vjAlignmentDownloadsView ({
             data : 'downloadAll',
            formName : formName,
            geometry : 0,
            selectCallback : "function:vjObjFunc('onPerformReferenceOperation','" + this.objCls + "')",
            isok : true
        });
        
        this.autoOpen = ["computed"];
        if (node.autoOpen && node.autoOpen.general)
            this.autoOpen = node.autoOpen.general;
        
        if (node.openTabsOnRefresh != undefined)
            openTabsOnRefresh = node.openTabsOnRefresh;
        
        var areaForDetails = {posId: 'major', top:'30%', bottom:'100%', left:'20%', right:'75%'};
        if (node.detailsTogether)
            areaForDetails = {posId: 'minimal2', top:'0', bottom:'30%', left:'60%', right:'100%'};
        
        hitListViewer = new vjAlignmentHitListControl({
            data : 'hitlist',
            loadedID: node.id,
               subsetCount: node.subsetCount,
               algoProc: node.algoProcess,
            formName : formName,
            isPartOfProfiler: node.profiler,
            checkable : node.checkable ? node.checkable : false,
            selectCallback : node.selectCallback ? node.selectCallback : "function:vjObjFunc('onSelectedHitListItem','" + this.objCls + "')",
            checkCallback : node.checkCallback ? node.checkCallback : "function:vjObjFunc('onCheckReferenceGenomes','" + this.objCls + "')",
            dbClickCallback: node.dbClickCallback,
            isok : true
        });
        
        var filesStructureToAdd = [{
            tabId: 'pieChart',
            tabName: "Pie Chart",
            position: {posId: 'pieChartArea', top:'0', bottom:'30%', left:'70%', right:'75%'},
            inactive: false,
            viewerConstructor: {
                dataViewer: "vjAlignmentHitPieView",
                dataViewerOptions:{
                    data: 'hitlist',
                    formName: formName,
                    selectCallback : "function:vjObjFunc('onSelectedHitListPieItem','" + this.objCls + "')",
                    isok : true
                }
            },
              autoOpen: this.autoOpen
        },
        {
            tabId: 'histogram',
            tabName: "Histogram",
            position: areaForDetails,
            inactive: true,
            viewerConstructor: {
                dataViewer: "vjAlignmentHistogramControl",
                dataViewerOptions:{
                    data : 'histograms',
                    dataHelp: 'help_histograms',
                    formName : formName,
                    isok : true
                }
            },
              autoOpen: this.autoOpen
        },
        {
            tabId: 'saturation',
            tabName: "Saturation",
            position: {posId: 'pieChartArea', top:'0', bottom:'30%', left:'70%', right:'75%'},
            inactive: true,
            viewerConstructor: {
                dataViewer: "vjAlignmentSaturationControl",
                dataViewerOptions:{
                    data: 'alSaturation',
                    formName: formName,
                    isok : true
                }
            },
              autoOpen: this.autoOpen
        },
        {
            tabId: 'hitList',
            tabName: "Hit List",
            position: {posId: 'minimal', top:'0', bottom:'30%', left:'20%', right:'70%'},
            viewerConstructor: {
                instance: hitListViewer
            },
              autoOpen: (node.autoOpen && node.autoOpen.hitList) ? node.autoOpen.hitList : this.autoOpen
        },
        {
            tabId: 'alignments',
            tabName: "Alignments",
            position: areaForDetails,
            viewerConstructor: {
                dataViewer: "vjAlignmentControl",
                dataViewerOptions:{
                    data : 'alView',
                    formName : formName,
                    isok : true
                }
            },
              autoOpen: (node.autoOpen && node.autoOpen.alignment) ? node.autoOpen.alignment : this.autoOpen
        },
        {
            tabId: 'stack',
            tabName: "Stack",
            position: areaForDetails,
            inactive: true,
            viewerConstructor: {
                dataViewer: "vjAlignmentStackControl",
                dataViewerOptions:{
                    data : {
                        stack : 'alStack',
                        basecallBias : 'alMutBias'
                    },
                    formName : formName,
                    isok : true
                }
            },
              autoOpen: this.autoOpen
        },
        {
            tabId: 'hitTables',
            tabName: "Hit Tables",
            position: areaForDetails,
            inactive: true,
            viewerConstructor: {
                dataViewer: "vjAlignmentMatchControl",
                dataViewerOptions:{
                    data : 'alMatch',
                    formName : formName,
                    isok : true
                }
            },
              autoOpen: this.autoOpen
        },
        {
            tabId: 'viewHelp',
            tabName: "Help",
            position: areaForDetails,
            inactive: true,
            viewerConstructor: {
                dataViewer: "vjHelpView",
                dataViewerOptions:{
                    data : 'help',
                    formName : formName,
                    isok : true
                }
            },
              autoOpen: this.autoOpen
        }];
        
        this.addTo = "results";
        if (node.addTo)
            this.addTo = node.addTo;
        algoWidgetObj.addTabs(filesStructureToAdd, this.addTo);
        
        if (this.addTo != "results" && (node.modifyResubmit || node.parentProc))
        {
            algoWidgetObj.moveTab("hitList", {top:"30%", left: "20%", right: "75%", bottom: "60%"}, 0);
            //algoWidgetObj.moveTab("pieChart", {top:'0%', bottom:'30%', left:'60%', right:'75%'}, 0);
            algoWidgetObj.moveTab("alignments", {top:'60%', bottom:'100%', left:'20%', right:'75%'}, 0);
            algoWidgetObj.closeTab("pieChart");
            algoWidgetObj.closeTab("saturation");
        }
        else if (this.addTo != "results" && node.profiler){
            algoWidgetObj.moveTab("hitList", {top:"0%", left: "20%", right: "60%", bottom: "30%"}, 0);
            algoWidgetObj.moveTab("alignments", {top:'0%', bottom:'30%', left:'60%', right:'75%'}, 0);
            algoWidgetObj.closeTab("pieChart");
            algoWidgetObj.closeTab("saturation");
        }
        
        algoWidgetObj.noAllDownloadsTab = true;
    };

    this.onPerformReferenceOperation = function(viewer, node, ir, ic) {
        var isArch = (viewer.tblArr.hdr[ic].name == "arch");
        var isDown = (viewer.tblArr.hdr[ic].name == "down");
        var oper = node.operation;
        var args = node.arguments;
        try {
            var params = JSON.parse(node.params);
        } catch (e) {
            params = node.params;
        }
        var url;
        
        if (oper == 'alStack' || oper == 'alView' || oper == 'alMatch'  || oper == 'alMutBias') {
            var operDS = vjDS[oper];
            if (!operDS)
                return;
            url = operDS.url;
            url = urlExchangeParameter(url, "cnt", '0');
            if (args)
                url += args;
            url = url.substring(7);
        } else
            url = this.makeReferenceOperationURL(viewer, node, node.operation, node.arguments, params);
        
        url = urlExchangeParameter(url, "down", '1');

        var backendCmd = docLocValue("cmd", 0, url);
        var extension ="fasta";
        if (backendCmd=="alFastq"){
            extension = "fastq";
        }

        if (isDown) {
            if (docLocValue("backend", 0, url)) {
                var saveAs = "o" + this.loadedID + "-" + oper + "-" + this.referenceID + "." + extension;
                this.dsQPBG.reload("qpbg_http://" + url, true, {
                    loadmode : "download",
                    saveas : saveAs
                });
            } else {
                document.location = url;
            }
        } else if (isArch) {
            url = urlExchangeParameter(url, "arch", 1);
            var dstName = node.data + " (" + this.loadedID + ")";
            var ext = "-";
            switch (node.arch) {
            case "dna":
                ext = "genome";
                dstName += ".fasta";
                break;
            case "dnaold":
                ext = extension;
                dstName += "." + extension;
                break;
            case "ico-file":
                ext = "txt";
                dstName += "." + ext;
                break;
            default:
                ext = "-";
            }

            url = urlExchangeParameter(url, "arch_dstname", dstName);
            url = urlExchangeParameter(url, "cgi_dstname", dstName);

            url = urlExchangeParameter(url, "ext", ext);
            if (url.indexOf("qpbg") == 0)
                this.dsQPBG_digest.reload(url, true);
            else
                this.dsQPBG_digest.reload("qpbg_http://" + url, true);
        }
    };

    this.makeReferenceOperationURL = function(viewer, node, oper, args, params) {
        if (oper == 'hitlist') {
            var url = urlExchangeParameter(vjDS[hitListViewer[1].data[0]].url.substring(7), "cnt", '0');
            return url;
        }

        var url = "?cmd=" + oper ;

        var referenceID = params && params.referenceID != undefined ? params.referenceID
                : this.referenceID;
        if (params === 'all')
            referenceID = 0;
        
        url = this.urlReferenceUpdate(url,referenceID);
        
        url += args;
        return url;
    };
    
    this.urlReferenceUpdate = function (url,referenceID) {
        url = urlExchangeParameter(url,"objs",this.loadedID);
        
        if (this.reqID){
            url = urlExchangeParameter(url,"req",this.reqID);
        }
        
        if (parseInt(referenceID) == 0) {
            url = urlExchangeParameter(url,"found",0);
        } else {
            if (referenceID != '+'){
                url = urlExchangeParameter(url,"mySubID",referenceID);
            }
            url = urlExchangeParameter(url,"found",1);
        }
        
        return url;
    }
   

    this.onSelectedHitListItem = function(viewer, node) {
        if (!isNumber(node.id))
            return 0;
        this.referenceNode = node;
        this.referenceID = node.id;

        if (this.mode == 'preview') {
            if (!this.isUnalignedSelected(node)) {
                vjDS['alView'].reload("http://" + this.makeReferenceOperationURL(viewer, node, 'alView') + "&cnt=20", false);
                vjDS['alStack'].reload(urlExchangeParameter(vjDS['alStack'].url, "objs", this.loadedID)+ "&mySubID=" + this.referenceID + "&cnt=20", false);
                vjDS['histograms'].reload(urlExchangeParameter(vjDS['histograms'].url, "objs", this.loadedID), false);
                vjDV.locate(this.dvinfo + "._active.").load();
            }
        } else {
            var downloadsViewer = this.downloadsViewer;
            if (downloadsViewer) {
                var t = "Reference Specific Data,down,arch,operation,arguments,params\n";
                if (this.isUnalignedSelected(node)) {
                    t += "Unaligned Reads,download,dnaold,alFasta,&backend=1," + quoteForCSV(JSON.stringify({referenceID: 0})) + "\n";
                    downloadsViewer.prefixHTML = "There were <b>" + downloadsViewer.formDataValue("" + node.Hits,'largenumber', node) + "</b> sequences that did not match any of the reference genomes.";
                } else {
                    downloadsViewer.prefixHTML = "<b>" + downloadsViewer.formDataValue("" + node.Hits, 'largenumber', node) + "</b> sequences were aligned to <b>" + node.Reference + "</b>";
                    t += "Aligned Reads,download,dnaold,alFasta,,\n"
                            + "Hit Table,download,ico-file,alMatch,,\nAlignments,download,ico-file,alView,,\n"
                            + "Alignments to currently selected reference in SAM format with original identifiers,download,ico-file,alSam,&qty=1&useOriginalID=1,\n"
                            + "Alignments to currently selected reference in SAM format using numeric identifiers,download,ico-file,alSam,&qty=1&useOriginalID=0,\n"
                            + "Stack,download,ico-file,alStack,,\nStack of non perfect alignments,download,ico-file,alStack,&alNonPerfOnly=1,\n"
                            + "Stack of alignments with mutation on specified position,download,ico-file,alStack,&alVarOnly=1,\n"
                            + "Mutation bias,download,ico-file,alMutBias,,\n";
                }

                vjDS['downloads'].reload("static://" + t, true);
            }
            if (!this.isUnalignedSelected(node)) 
            {
                if (openTabsOnRefresh)
                {
                    algoWidgetObj.openTab("histogram");
                    algoWidgetObj.openTab("stack");
                    algoWidgetObj.openTab("hitTables");
                    algoWidgetObj.openTab("alignments");
                }
                
                vjDS['alView'].reload(urlExchangeParameter(this.urlReferenceUpdate( vjDS['alView'].url, this.referenceID),"cnt",20), true);
                vjDS['alMatch'].reload(urlExchangeParameter(this.urlReferenceUpdate( vjDS['alMatch'].url, this.referenceID),"cnt",20), true);
                vjDS['alStack'].reload(urlExchangeParameter(urlExchangeParameter(this.urlReferenceUpdate( vjDS['alStack'].url, this.referenceID),"cnt",20),"alHigh",50), true);
                vjDS['alMutBias'].reload(urlExchangeParameter(this.urlReferenceUpdate( vjDS['alMutBias'].url, this.referenceID),"cnt",20), true);
                vjDS['histograms'].reload(this.urlReferenceUpdate( vjDS['histograms'].url,this.referenceID), true);
            }
            else
            {
                algoWidgetObj.closeTab("histogram");
                algoWidgetObj.closeTab("alignments");
                algoWidgetObj.closeTab("stack");
                algoWidgetObj.closeTab("hitTables");
            }
        }
    };
    
    this.onSelectedHitListPieItem = function (viewer, node){
        //this will make sure that the selecting from pie chart will also select the item from hit list table 
        hitListViewer[1].onClickCell(hitListViewer[1], node.irow, 0);
    }

    this.onCheckReferenceGenomes = function(viewer, node) {

        this.selfUpdate = 1;
        if (this.callbackChecked)
            funcLink(this.callbackChecked, viewer, this);
        this.selfUpdate = 0;
    };

    this.isUnalignedSelected = function(row) {
        var unalignedSelected = false;
        var nodeID = row.id;
        if (isNumber(nodeID) && !Int(nodeID))
            unalignedSelected = true;

        return unalignedSelected;
    };

};
