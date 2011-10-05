<?php
    /////////////////////////////////////////////
    // Configuration
    //
    // SQL Parameters
    $host = "somehost";
    $user = "someuser";
    $pass = "helpimtrappedinacodefactory";
    $db   = "somedb";
    //////////////////////////////////////////////

    header('Content-type: text/xml');
    header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
    header("Expires: Sat, 26 Jul 1997 05:00:00 GMT"); // Date in the past
    echo '<?xml version="1.0" encoding="UTF-8"?>';
    echo "\n";
    echo '<Response>';
    echo "\n";

    $user_pushed=(int) $_REQUEST['Digits'];

    if (($user_pushed) == 1){
        echo "    <Say>Triggering collage reset</Say>\n";
        // Connecting, selecting database, deleting all the images
        $link = mysql_connect($host, $user, $pass)
            or die(mysql_error());
        mysql_select_db($db) or die('<response><sms>Could not select database</sms></response>');
        
	    $query = "delete from images";
        $resultset = mysql_query($query); 
        mysql_close($link);

        // Add the action to the actions table
        $link = mysql_connect($host, $user, $pass)
            or die(mysql_error());
        mysql_select_db($db) or die('<response><sms>Could not select database</sms></response>');
        
	    $query = "insert into actions(action) values ('reset')";
        $resultset = mysql_query($query); 
        mysql_close($link);
    }else{
        echo "    <Say>Looks like you entered a value that I did not recognize</Say>\n";
    }
    echo "</Response>\n";
?>
