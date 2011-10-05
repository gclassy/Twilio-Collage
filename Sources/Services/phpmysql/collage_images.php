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

    header("content-type: text/xml");
    header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
    header("Expires: Sat, 26 Jul 1997 05:00:00 GMT"); // Date in the past

    echo "<?xml version=\"1.0\" encoding=\"UTF-8\" ?>\n";

    $id = -1;
    if ($_GET['id']){
      $id = $_GET['id'];
    }

    $s_ok = 1;
    if ($s_ok == 1){
        // Connecting, selecting database
        $link = mysql_connect($host, $user, $pass)
            or die(mysql_error());
        mysql_select_db($db) or die('<response><sms>Could not select database</sms></response>');
        
        $query = "select id, insertDate, uploadedBy, URL from images where id > " . $id;
        $resultset = mysql_query($query); // TODO: where id > ?id

        echo "<response>\n";

        while ($row = mysql_fetch_assoc($resultset)) {
            echo "<twImage>\n";
            echo "  <id>" . $row['id'] . "</id>";
            echo "  <insertDate>" . $row['insertDate'] . "</insertDate>\n";
            echo "  <uploadedBy>" . $row['uploadedBy'] . "</uploadedBy>\n";
            echo "  <src>" . $row['URL'] . "</src>\n";
            echo "</twImage>\n";
        }

        echo "</response>\n";
        // Closing connection
        mysql_close($link);
    }
?> 
