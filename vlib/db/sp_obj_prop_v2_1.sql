
DROP PROCEDURE IF EXISTS `sp_obj_prop_v2_1`;

DELIMITER //

CREATE PROCEDURE `sp_obj_prop_v2_1`(
    IN p_user_id BIGINT UNSIGNED,
    IN p_member_sql VARCHAR(4096),
    IN p_SID BIGINT UNSIGNED,
    IN p_prop_list MEDIUMTEXT
)
    READS SQL DATA
BEGIN
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
    SELECT f.domainID, f.objID, NULL AS ionID, f.`name`, f.`group`, f.`value`
        FROM tmp_last_ids t JOIN UPObjField f ON
            (f.domainID = t.domainID OR (f.domainID IS NULL AND t.domainID = 0)) AND f.objID = t.objID
        WHERE t.sid = p_SID AND IF(LENGTH(p_prop_list) > 0, FIND_IN_SET(`name`, p_prop_list) > 0, TRUE);

    DELETE FROM tmp_last_ids WHERE `sid` = p_SID;

END //
DELIMITER ;
