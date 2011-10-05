<?php

    /////////////////////////////////////////////
    // Configuration
    //
    $sid = '##################b38d09f4d5841d44'; // The account SID
    $token = '###############################0'; // The account TOKEN (don't share)

    $phonenumber = '+###########';                 // an authorized phone number
    $adminphone  = '+###########';                 // the administrator phone #
    $baseURL     = "http://wheresgus.com/twilio/"; // the base URL for handlers

    // SQL Parameters
    $host = "########################";
    $user = "############";
    $pass = "helpimtrappedinacodefactory";
    $db   = "###########";
    //////////////////////////////////////////////

    require 'Services/Twilio.php';
    ini_set ("display_errors", 0);

    header("content-type: text/xml");
    header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
    header("Expires: Sat, 26 Jul 1997 05:00:00 GMT"); // Date in the past

    echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
    $from = $_REQUEST['From'];
    $body = $_REQUEST['Body'];    

    $message = "Unknown error";

    $wasCmd  = "false";

    // ADMIN MODE ## 
    // Can call reset command, etc...
    // TODO: multiwall, requires support for various #s and other commands
    if ($from == $adminphone){
        if ($body == 'reset'){
            $wasCmd  = 'true';
			// perform reset sequence on #'s
            // Twilio REST API version
            $version = '2010-04-01';
            // Set account SID and AuthToken

            $client = new Services_Twilio($sid, $token, $version);

            $handlerURL = $baseURL + "handle_call.php";

            try{
                    $call = $client->account->calls->create(
                            $phonenumber, $from, $handlerURL
                    );
            }catch (Exception $e){
               $message = 'Error: ' . $e->getMessage();
            }
            $message = "Collage reset initiated!";
        }else if ($body == 'easter'){
            $wasCmd = 'true';
		    // do something to change the effect
		}
    }

    if ($wasCmd == 'false'){
        $size   = getimagesize($body);
        $s_ok   = 0;
        $width  = -1;
        $height = -1;
        if ($size) {
            $width = $size[0];
            $height = $size[1];
            $s_ok = 1;
        } else {
            // error
            $message = "Error: url wasn't an image";
        }

        if ($s_ok == 1){
            // Connecting, selecting database
            $link = mysql_connect($host, $user, $pass)
                or die('<response><sms>Could not connect: ' . mysql_error() . '<sms></response>');
            mysql_select_db($db) or die('<response><sms>Could not select database</sms></response>');

        // TODO: mysql_real_escape_string( 
            mysql_query("insert into images(insertDate, uploadedBy, URL) values (NOW(), '$from', '$body')");

            // Closing connection
            mysql_close($link);
            $message = 'Upload succeeded! Width:' . $width . " Height:" . $height;
        }
    }else{
        // TODO: insert command / action code here to ensure that the client refreshes
    }
?> 
<!-- text the user with the status -->
<Response>
<Sms><?=$message?></Sms>
</Response>
