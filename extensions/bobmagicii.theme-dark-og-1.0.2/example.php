<?php

class SweetAppBruh
extends AnotherSweetThing {

	private
	$Title = 'Totally Sweet.';

	public function
	CountTo(Int $Max):
	Void {
	/*//
	count from 1 to the specified number.
	//*/

		$Iter;

		if($Max < 1)
		throw new Exception('Max must be greater than 1.');

		for($Iter = 1; $Iter <= $Max; $Iter++)
		echo "{$Iter} ah ah ah", PHP_EOL;

		return;
	}

}

