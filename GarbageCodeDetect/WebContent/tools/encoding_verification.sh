#!/bin/ksh

#for file in `find /gsa/ausgsa/home/a/w/awiggint/public/jameshall -name *.la`
#for dir in `find $1 -type d`
#do
	
file=$1
BASEDIR=$(dirname $0)

locale=`dirname $file | xargs -I @ basename @ | awk -F. '{print $1}' | sed "s/^En_US/en_US/g"` 
codesets=`dirname $file | xargs -I @ basename @ | awk -F. '{print $2}' | sed "s/^8859-/ISO8859-/g"` 
codesetStr=$codesets
if [ -z "$codesets" ]; then
	codesets=`/usr/lib/nls/lsmle -c  | grep " \[$locale" | awk '{print $1}'`
	codesetStr=`/usr/lib/nls/lsmle -c  | grep " \[$locale" | awk '{print $1}' |  xargs | tr ' ' '/'`
	#codesets=`LANG=$locale locale charmap`
fi

extension=`basename $file | awk -F . '{print $NF}'`

if [ "$extension" == "cat" ]; then
    #dspcat -g $file > $BASEDIR/dspcat_out.out
    $BASEDIR/msgtst_64 $file > $BASEDIR/msgtst.out
    file="$BASEDIR/msgtst.out"
fi

result="$1:$locale:$codesetStr:fail"
for codeset in $codesets
do
	iconv -f $codeset -t UTF-16 $file > $BASEDIR/iconv.out 2>&1
	if [ $? -eq 0 ]; then
		result="$1:$locale:$codesetStr:pass"
	else
		break
	fi
done

echo $result

#done



