#!/bin/sh
#/*
# *  ::718604!
# * 
# * Copyright(C) November 20, 2014 U.S. Food and Drug Administration
# * Authors: Dr. Vahan Simonyan (1), Dr. Raja Mazumder (2), et al
# * Affiliation: Food and Drug Administration (1), George Washington University (2)
# * 
# * All rights Reserved.
# * 
# * The MIT License (MIT)
# * 
# * Permission is hereby granted, free of charge, to any person obtaining
# * a copy of this software and associated documentation files (the "Software"),
# * to deal in the Software without restriction, including without limitation
# * the rights to use, copy, modify, merge, publish, distribute, sublicense,
# * and/or sell copies of the Software, and to permit persons to whom the
# * Software is furnished to do so, subject to the following conditions:
# * 
# * The above copyright notice and this permission notice shall be included
# * in all copies or substantial portions of the Software.
# * 
# * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
# * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
# * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
# * DEALINGS IN THE SOFTWARE.
# */

dna_alingx_finalize() {
    if [[ "${output_fmt}" == "tsv" ]]; then
        cnt=0
        if [[ ${finalFiles:0:1} == "@" ]]; then
            finalFiles=`cat ${finalFiles:1}`
        fi
        for f in ${finalFiles}; do
            if [[ ${cnt} -lt 1 ]]; then
                echo -e "qseqid\tsseqid\tpident\tlenght\tmismatch\tgapopen\tqstart\tqend\tsstart\tsend\tevalue\tbitscore" > ${resultPath}.tsv
            fi
            echo "Append ${f} to ${resultPath}.tsv"
            cat ${f} >> ${resultPath}.tsv
            let cnt=${cnt}+1
        done
    else
        outDir=`dirname ${resultPath}` # remove /algorithm from path
        if [[ ${finalFiles:0:1} == "@" ]]; then
            cat ${finalFiles:1} | zip --junk-paths -@ ${outDir}/All_Blast_Output.zip
        else
            zip --junk-paths ${outDir}/All_Blast_Output.zip ${finalFiles}
        fi
    fi
}
