<?php
    header('Content-type: text/xml');
    header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
    header("Expires: Sat, 26 Jul 1997 05:00:00 GMT"); // Date in the past
    echo '<?xml version="1.0" encoding="UTF-8"?>';
?>
<Response>
    <Gather numDigits="1" action="http://replace with your site/twilio/admin_ivr.php">
        <Say>Thank you for initiating the administrative interface for twilio collage</Say>
        <Say>To reset your collage, press 1.</Say>
    </Gather>
    <Say>Sorry, I didn't get your response.</Say>
    <Redirect>http://replace with your site.com/twilio/handle_call.php</Redirect>
</Response>
